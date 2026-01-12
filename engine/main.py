"""
QuidSiBackend
=======================
Motore di routing basato su fisica, gestione traffico dinamico e scenari MongoDB.
"""

import uvicorn
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import networkx as nx
import json
from shapely.geometry import shape, Point, mapping
from shapely.ops import unary_union
from pydantic import BaseModel, Field
from typing import List, Optional
from urllib.parse import unquote
import math
import logging
import sys
import os
from collections import defaultdict
import traceback

# --- CONFIGURAZIONE LOGGING ---
logging.basicConfig(
    level=logging.INFO, 
    format="%(asctime)s [%(levelname)s] %(message)s",
    stream=sys.stdout
)
logger = logging.getLogger("QuidEngine")

# --- CONFIGURAZIONE COSTANTI ---
# Parametri fisici per il calcolo dei pesi
GRID_SIZE = 0.005             # Dimensione celle griglia spaziale (~500m)
INTERSECTION_PENALTY = 0.05   # Penalità per nodo/incrocio (minuti)
CURVE_FACTOR = 0.4            # Fattore di penalità per strade sinuose
DEFAULT_TRAFFIC = 1.0         # Moltiplicatore base (1.0 = nessun traffico)

# Mappa dei livelli di traffico
TRAFFIC_LEVELS = {
    "low": 1.0,    # Scorrevole
    "medium": 1.5, # Rallentamenti (+50% tempo)
    "high": 2.5,   # Intenso (+150% tempo)
    "jam": 5.0     # Blocco critico
}

# --- CONNESSIONE DATABASE ---
MONGO_URL = os.getenv("MONGO_URL", "mongodb://database:27017")
db = None

try:
    from motor.motor_asyncio import AsyncIOMotorClient
    from bson import ObjectId
    # Timeout breve (2s) per evitare blocchi all'avvio se il DB non risponde
    client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=2000)
    db = client.quidsi
    logger.info(f"Driver Motor inizializzato su {MONGO_URL}")
except ImportError:
    logger.warning("WARN: Libreria 'motor' non trovata. Funzionalità Scenari disabilitata.")
except Exception as e:
    logger.error(f"ERR: Errore inizializzazione Client Mongo: {e}")

# --- STATO GLOBALE ---
G = nx.MultiDiGraph()            # Il grafo stradale caricato in memoria
closed_streets = set()           # Set di ID strade chiuse (blacklist)
spatial_grid = defaultdict(list) # Indice spaziale per lookup rapido nodi
CURRENT_TRAFFIC = DEFAULT_TRAFFIC

# --- HELPER MATEMATICI ---

def calculate_distance(p1: tuple, p2: tuple) -> float:
    """
    Calcola la distanza tra due punti (Lat, Lon).
    Detecta automaticamente se usare Euclidea (metri proiettati) o Sferica (gradi).
    """
    # Se coordinate > 180, assumiamo proiezione metrica (es. WebMercator)
    if abs(p1[0]) > 180 or abs(p1[1]) > 180:
        return math.sqrt((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2)
    
    # Altrimenti calcolo approssimato per Gradi (Lat/Lon)
    # 1° Lat ~= 111.32 km. 1° Lon varia col coseno della latitudine.
    d_lat = (p1[1] - p2[1]) * 111320
    d_lon = (p1[0] - p2[0]) * 111320 * math.cos(math.radians(p1[1]))
    return math.sqrt(d_lat**2 + d_lon**2)

def get_geometry_length(geom) -> float:
    """Restituisce la lunghezza totale in metri di una geometria Shapely."""
    total = 0.0
    parts = [geom] if geom.geom_type == 'LineString' else (geom.geoms if geom.geom_type == 'MultiLineString' else [])
    for part in parts:
        coords = list(part.coords)
        for i in range(len(coords)-1):
            total += calculate_distance(coords[i], coords[i+1])
    return total

def get_nearest_node(lat: float, lon: float):
    """
    Trova il nodo del grafo più vicino alle coordinate date
    usando l'indice spaziale (spatial_grid) per performance.
    """
    try:
        gx, gy = int(lat/GRID_SIZE), int(lon/GRID_SIZE)
        cands = []
        # Cerca nella cella corrente e adiacenti
        for i in range(gx-1, gx+2):
            for j in range(gy-1, gy+2):
                cands.extend(spatial_grid.get((i,j), []))
        
        # Fallback: cerca su tutto il grafo se la griglia fallisce
        if not cands: cands = list(G.nodes)
        if not cands: return None
        
        lat_corr = 1.0 if abs(lat) > 180 else math.cos(math.radians(lat))
        return min(cands, key=lambda n: (n[0]-lat)**2 + ((n[1]-lon)*lat_corr)**2)
    except: return None

# --- CICLO DI VITA (STARTUP) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gestisce l'inizializzazione del grafo stradale e la verifica del DB.
    Include la logica di 'Fisica di Guida' (calcolo pesi basato su curve).
    """
    global G, spatial_grid
    logger.info("--- STARTUP: Inizializzazione QuidEngine ---")
    
    G = nx.MultiDiGraph()
    spatial_grid = defaultdict(list)
    
    # 1. Caricamento Grafo da GeoJSON
    if os.path.exists('grafo_optimized.geojson'):
        try:
            with open('grafo_optimized.geojson', 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            logger.info("Caricamento nodi e calcolo fisica...")
            count = 0
            
            for f in data['features']:
                try:
                    p = f['properties']
                    geom = shape(f['geometry'])
                    if not geom or geom.is_empty: continue
                    
                    rid = str(p.get('name') or p.get('desvia') or "unknown").strip().lower()
                    real_len = get_geometry_length(geom)
                    if real_len <= 0: continue

                    # Analisi Sinuosità (Curve)
                    coords = list(geom.coords) if geom.geom_type=='LineString' else list(geom.geoms[0].coords)
                    lin_dist = calculate_distance(coords[0], coords[-1])
                    sinuosity = real_len/lin_dist if lin_dist > 1 else 1.0
                    
                    # Calcolo Velocità Reale
                    base_speed = max(float(p.get('speed', 30)), 10.0)
                    real_speed = base_speed / (1 + (max(0, sinuosity-1.05)*CURVE_FACTOR))
                    
                    # Calcolo Pesi
                    # base_weight: tempo in minuti in condizioni ideali (senza traffico)
                    base_weight = ((real_len/(real_speed/3.6))/60.0) + INTERSECTION_PENALTY
                    oneway = str(p.get('oneway') or 0).lower() in ['1', 'yes', 'true']
                    
                    # Suddivisione in segmenti
                    parts = [geom] if geom.geom_type == 'LineString' else geom.geoms
                    for part in parts:
                        sub = list(part.coords)
                        for i in range(len(sub)-1):
                            u = (sub[i][1], sub[i][0])
                            v = (sub[i+1][1], sub[i+1][0])
                            seg_dist = calculate_distance(sub[i], sub[i+1])
                            ratio = seg_dist / real_len
                            
                            w = base_weight * ratio
                            
                            # Salviamo 'base_weight' per poter applicare moltiplicatori traffico dopo
                            G.add_edge(u, v, weight=w, base_weight=w, distance=seg_dist, road_id=rid)
                            if not oneway: 
                                G.add_edge(v, u, weight=w, base_weight=w, distance=seg_dist, road_id=rid)
                    count += 1
                except: pass
            
            # Creazione Indice Spaziale
            for n in G.nodes: spatial_grid[(int(n[0]/GRID_SIZE), int(n[1]/GRID_SIZE))].append(n)
            logger.info(f"GRAFO CARICATO: {len(G.nodes)} nodi pronti.")
        except Exception as e:
            logger.error(f"ERRORE CARICAMENTO GEOJSON: {e}")

    # 2. Verifica Connessione DB
    if db is not None:
        try:
            await db.command("ping")
            logger.info("MongoDB: Connessione stabilita.")
        except Exception as e:
            logger.warning(f"MongoDB: Configurato ma non raggiungibile ({e}).")
    
    yield
    # Shutdown
    G.clear()
    logger.info("--- SHUTDOWN ---")

# --- INIZIALIZZAZIONE APP ---
app = FastAPI(
    title="QuidEngine API",
    description="API per routing stradale, calcolo isocrone e gestione traffico.",
    version="4.2",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- GESTIONE ERRORI GLOBALE ---
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Cattura errori imprevisti per evitare crash CORS lato client."""
    logger.error(f"SERVER ERROR ({request.url}): {exc}")
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)},
        headers={"Access-Control-Allow-Origin": "*"}
    )

# --- DTO (Data Transfer Objects) ---
class RouteReq(BaseModel):
    start: List[float] = Field(..., description="[Lat, Lon] partenza")
    end: List[float] = Field(..., description="[Lat, Lon] arrivo")

class IsoReq(BaseModel):
    center: List[float]
    minutes: float

class ScenarioReq(BaseModel):
    name: str
    closed_ids: List[str]

# --- ENDPOINTS API ---

@app.get("/", tags=["System"])
def root():
    """Health check del sistema."""
    return {
        "status": "online", 
        "traffic_multiplier": CURRENT_TRAFFIC,
        "nodes_loaded": len(G.nodes),
        "db_active": db is not None
    }

@app.post("/api/set-traffic/{level}", tags=["Traffic"])
async def set_traffic(level: str):
    """
    Imposta il livello di traffico globale.
    Livelli: low (1.0), medium (1.5), high (2.5), jam (5.0).
    """
    global CURRENT_TRAFFIC
    if level in TRAFFIC_LEVELS:
        CURRENT_TRAFFIC = TRAFFIC_LEVELS[level]
        # Aggiornamento massivo dei pesi nel grafo
        count = 0
        for u, v, d in G.edges(data=True):
            if 'base_weight' in d:
                d['weight'] = d['base_weight'] * CURRENT_TRAFFIC
                count += 1
        return {"status": "updated", "level": level, "edges_updated": count}
    raise HTTPException(400, f"Livello invalido. Validi: {list(TRAFFIC_LEVELS.keys())}")

@app.post("/api/calculate-route", tags=["Routing"])
async def calculate_route(r: RouteReq):
    """Calcola il percorso migliore tra due punti."""
    s = get_nearest_node(r.start[0], r.start[1])
    e = get_nearest_node(r.end[0], r.end[1])
    if not s or not e: raise HTTPException(400, "Coordinate fuori dalla mappa.")

    # Filtro strade chiuse
    def flt(u,v,k): 
        try: return G[u][v][k].get('road_id','') not in closed_streets
        except: return True
    view = nx.subgraph_view(G, filter_edge=flt)

    try:
        path = nx.shortest_path(view, s, e, weight='weight')
        
        # Costruzione risposta dettagliata
        t, d = 0, 0
        instr = []
        if len(path) > 1:
            curr_n, curr_d = "Start", 0
            for i in range(len(path)-1):
                try:
                    dd = next(iter(view[path[i]][path[i+1]].values()))
                    seg_dist = dd.get('distance',0)
                    d += seg_dist
                    t += dd.get('weight',0)
                    nm = str(dd.get('road_id','Strada')).title()
                    
                    if nm == curr_n: 
                        curr_d += seg_dist
                    else:
                        if curr_n != "Start": instr.append({"name": curr_n, "dist": curr_d})
                        curr_n = nm
                        curr_d = seg_dist
                except: pass
            instr.append({"name": curr_n, "dist": curr_d})
            
        return {
            "path": [list(n) for n in path], 
            "instructions": instr, 
            "stats": {"real":{"time":t, "dist":d}, "delta":{"time":0,"dist":0}}
        }
    except nx.NetworkXNoPath:
        raise HTTPException(404, "Percorso non trovato (destinazione irraggiungibile)")
    except Exception as e:
        logger.error(f"Routing Error: {e}")
        raise HTTPException(500, "Errore interno calcolo percorso")

@app.post("/api/calculate-isochrone", tags=["Routing"])
async def isochrone(r: IsoReq):
    """Calcola poligono di raggiungibilità (Isocrona)."""
    c = get_nearest_node(r.center[0], r.center[1])
    if not c: return {"type":"FeatureCollection","features":[]}
    
    def flt(u,v,k): return G[u][v][k].get('road_id','') not in closed_streets
    view = nx.subgraph_view(G, filter_edge=flt)
    
    try:
        # radius è in minuti (peso)
        sub = nx.ego_graph(view, c, radius=r.minutes, distance='weight')
        pts = [Point(n[1],n[0]) for n in sub.nodes]
        # Buffer 0.002 gradi ~= 200m
        return mapping(unary_union([p.buffer(0.002) for p in pts])) if pts else {"type":"FeatureCollection","features":[]}
    except: return {"type":"FeatureCollection","features":[]}

@app.post("/api/toggle-closure/{rid}", tags=["Management"])
async def toggle(rid: str):
    """Chiude o apre una strada dato il suo ID."""
    rid = str(unquote(rid)).strip().lower()
    if rid in closed_streets: closed_streets.remove(rid)
    else: closed_streets.add(rid)
    return {"current": list(closed_streets)}

@app.post("/api/reset-closures", tags=["Management"])
async def reset():
    """Rimuove tutte le chiusure."""
    closed_streets.clear()
    return {"status": "ok"}

# --- ENDPOINTS SCENARI (MONGODB) ---

@app.get("/api/scenarios", tags=["Scenarios"])
async def get_sc():
    """Lista scenari salvati."""
    if db is None: return [] # Fail-safe
    try:
        l = await db.scenarios.find().to_list(100)
        return [{"_id": str(x["_id"]), "name": x["name"], "closed_ids": x.get("closed_ids",[])} for x in l]
    except Exception as e:
        logger.error(f"DB Error: {e}")
        return []

@app.post("/api/scenarios", tags=["Scenarios"])
async def add_sc(s: ScenarioReq):
    """Salva nuovo scenario."""
    if db is None: raise HTTPException(503, "Database non disponibile")
    try:
        r = await db.scenarios.insert_one(s.dict())
        return {"_id": str(r.inserted_id)}
    except: raise HTTPException(500, "Errore salvataggio")

@app.post("/api/scenarios/{sid}/apply", tags=["Scenarios"])
async def apply_sc(sid: str):
    """Applica uno scenario (sovrascrive le chiusure attuali)."""
    global closed_streets
    if db is None: raise HTTPException(503, "Database non disponibile")
    try:
        x = await db.scenarios.find_one({"_id": ObjectId(sid)})
        if x: 
            closed_streets = set(x.get("closed_ids", []))
            return {"status": "applied", "count": len(closed_streets)}
        raise HTTPException(404, "Scenario non trovato")
    except: raise HTTPException(400, "ID Invalido")

@app.delete("/api/scenarios/{sid}", tags=["Scenarios"])
async def del_sc(sid: str):
    """Elimina uno scenario."""
    if db is None: raise HTTPException(503, "Database non disponibile")
    try:
        await db.scenarios.delete_one({"_id": ObjectId(sid)})
        return {"status": "deleted"}
    except: raise HTTPException(400, "ID Invalido")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=4000, reload=True)