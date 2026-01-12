"""
QuidEngine Backend Server
=========================
Server FastAPI per il calcolo di percorsi ottimali, isocrone e gestione scenari.
Include logica "smart" per la gestione di coordinate miste (Metri/Gradi) e 
tolleranza ai guasti (Database e Geometrie opzionali).
"""

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import networkx as nx
import json
from shapely.geometry import shape, Point, mapping
from shapely.ops import unary_union
from pydantic import BaseModel
from typing import List, Optional
from urllib.parse import unquote
import math
import logging
import sys
import os
from collections import defaultdict

# --- CONFIGURAZIONE LOGGING ---
logging.basicConfig(level=logging.INFO, stream=sys.stdout)
logger = logging.getLogger("QuidEngine")

# --- IMPORTAZIONI CON FALLBACK (SAFETY) ---
# Tenta di importare librerie opzionali per evitare crash in ambienti incompleti
try:
    from geopy.distance import geodesic
except ImportError:
    geodesic = None
    logger.warning("WARN: Libreria 'geopy' non trovata. Verrà usato un fallback matematico per le distanze.")

# --- CONFIGURAZIONE DATABASE (MongoDB) ---
db = None
try:
    from motor.motor_asyncio import AsyncIOMotorClient
    from bson import ObjectId
    # Recupera l'URL da variabile d'ambiente (default per Docker: mongodb://mongo:27017)
    MONGO_URL = os.getenv("MONGO_URL", "mongodb://mongo:27017") 
    client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=5000)
    db = client.quidsi
except Exception as e:
    logger.error(f"CRITICAL: Connessione al Database fallita ({e}). Il server partirà in modalità limitata.")

# --- STATO GLOBALE DELL'APPLICAZIONE ---
G = nx.MultiDiGraph()               # Grafo stradale (NetworkX)
closed_streets = set()              # Set di ID strade chiuse temporaneamente
spatial_grid = defaultdict(list)    # Indice spaziale per ricerca rapida nodi
GRID_SIZE = 0.005                   # Dimensione celle griglia (~500m)

# --- FUNZIONI DI UTILITÀ (CORE LOGIC) ---

def get_geometry_length(geometry) -> float:
    """
    Calcola la lunghezza di una geometria in metri gestendo automaticamente
    sistemi di riferimento diversi e topologie complesse.

    Args:
        geometry (Shapely Geometry): LineString o MultiLineString.

    Returns:
        float: Lunghezza totale in metri.
    """
    total = 0.0
    try:
        # Normalizzazione: Gestisce sia linee singole che spezzate multiple
        if geometry.geom_type == 'LineString': geoms = [geometry]
        elif geometry.geom_type == 'MultiLineString': geoms = geometry.geoms
        else: return 0.0

        for line in geoms:
            coords = list(line.coords)
            for i in range(len(coords) - 1):
                p1, p2 = coords[i], coords[i+1]
                
                # Rilevamento automatico: Se coordinate > 180, sono Metri (Proiezione Piana)
                if abs(p1[0]) > 180 or abs(p1[1]) > 180:
                    # Calcolo Euclideo
                    total += math.sqrt((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2)
                else:
                    # Rilevamento: Coordinate < 180, sono Gradi (Lat/Lon)
                    if geodesic:
                        try:
                            # Geodesic vuole (Lat, Lon), Shapely fornisce (Lon, Lat)
                            total += geodesic((p1[1], p1[0]), (p2[1], p2[0])).meters
                        except: 
                            # Fallback matematico approssimativo in caso di errore geopy
                            total += math.sqrt((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2) * 111000
                    else:
                        # Fallback se geopy non è installato
                        total += math.sqrt((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2) * 111000
    except: return 0.0 # Fail-safe per evitare crash server
    return total

def get_nearest_node(lat: float, lon: float):
    """
    Trova il nodo del grafo più vicino alle coordinate date utilizzando
    una ricerca ottimizzata su griglia spaziale.
    """
    try:
        gx, gy = int(lat/GRID_SIZE), int(lon/GRID_SIZE)
        cands = []
        # Cerca nella cella corrente e nelle 8 adiacenti
        for i in range(gx-1, gx+2):
            for j in range(gy-1, gy+2):
                cands.extend(spatial_grid.get((i,j), []))
        
        # Se la griglia fallisce, cerca su tutto il grafo (fallback lento)
        if not cands: cands = list(G.nodes)
        if not cands: return None
        
        # Correzione sferica della longitudine per il calcolo della distanza
        lat_corr = 1.0 if abs(lat) > 180 else math.cos(math.radians(lat))
        return min(cands, key=lambda n: (n[0]-lat)**2 + ((n[1]-lon)*lat_corr)**2)
    except: return None

# --- GESTIONE CICLO DI VITA (STARTUP/SHUTDOWN) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gestisce l'inizializzazione del grafo e la connessione al DB all'avvio dell'app.
    """
    global G, spatial_grid
    logger.info("--- STARTUP INIZIATO ---")
    G = nx.MultiDiGraph()
    spatial_grid = defaultdict(list)

    if os.path.exists('grafo_optimized.geojson'):
        try:
            logger.info("Caricamento GeoJSON...")
            with open('grafo_optimized.geojson', 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            for f in data['features']:
                try:
                    p = f['properties']
                    geom = shape(f['geometry'])
                    rid = str(p.get('name') or p.get('desvia') or "unknown").strip().lower()
                    speed = max(float(p.get('speed', 30)), 10.0) # Velocità minima sicurezza 10km/h
                    
                    dist = get_geometry_length(geom)
                    mins = (dist / (speed/3.6)) / 60.0
                    oneway = str(p.get('oneway') or 0).lower() in ['1', 'yes', 'true']

                    # Gestione archi del grafo
                    parts = [geom] if geom.geom_type == 'LineString' else (geom.geoms if geom.geom_type == 'MultiLineString' else [])
                    for part in parts:
                        coords = list(part.coords)
                        for i in range(len(coords)-1):
                            u = (coords[i][1], coords[i][0])
                            v = (coords[i+1][1], coords[i+1][0])
                            G.add_edge(u, v, weight=mins, distance=dist, road_id=rid)
                            if not oneway: G.add_edge(v, u, weight=mins, distance=dist, road_id=rid)
                except: pass # Ignora singole feature corrotte per non bloccare il caricamento
            
            # Costruzione indice spaziale
            for n in G.nodes: spatial_grid[(int(n[0]/GRID_SIZE), int(n[1]/GRID_SIZE))].append(n)
            logger.info(f"Grafo caricato con successo: {len(G.nodes)} nodi attivi.")
        except Exception as e: logger.error(f"Errore critico lettura JSON: {e}")
    else:
        logger.error("ERRORE: FILE GEOJSON MANCANTE. Il routing non funzionerà.")

    yield # L'applicazione gira qui
    
    # Pulizia risorse allo spegnimento
    G.clear()
    logger.info("--- SHUTDOWN COMPLETATO ---")

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# --- MODELLI DATI (DTO) ---
class RouteReq(BaseModel):
    start: List[float] # [Lat, Lon]
    end: List[float]   # [Lat, Lon]
class IsoReq(BaseModel):
    center: List[float]
    minutes: float
class ScenarioReq(BaseModel):
    name: str
    closed_ids: List[str]

# --- ENDPOINTS API ---

@app.get("/")
def root(): 
    """Health check per verificare lo stato del servizio e del DB."""
    return {"status": "ok", "db_connected": db is not None}

@app.post("/api/calculate-route")
async def route(r: RouteReq):
    """Calcola il percorso più breve evitando le strade chiuse."""
    if not r.start or not r.end: raise HTTPException(400, "Dati coordinate mancanti")
    s, e = get_nearest_node(r.start[0], r.start[1]), get_nearest_node(r.end[0], r.end[1])
    if not s or not e: raise HTTPException(400, "Punti fuori dalla mappa coperta")
    
    # Filtro dinamico: esclude archi che hanno 'road_id' nel set closed_streets
    def flt(u,v,k): 
        try: return G[u][v][k].get('road_id','') not in closed_streets
        except: return True
    view = nx.subgraph_view(G, filter_edge=flt)

    try:
        path = nx.shortest_path(view, s, e, weight='weight')
        
        # Generazione statistiche e istruzioni di navigazione
        t, d = 0, 0
        instr = []
        if len(path) > 1:
            curr_n, curr_d = "Start", 0
            for i in range(len(path)-1):
                try:
                    dd = next(iter(view[path[i]][path[i+1]].values()))
                    d += dd.get('distance',0)
                    t += dd.get('weight',0)
                    nm = str(dd.get('road_id','Strada')).title()
                    if nm == curr_n: curr_d += dd.get('distance',0)
                    else:
                        if curr_n != "Start": instr.append({"name": curr_n, "dist": curr_d})
                        curr_n = nm
                        curr_d = dd.get('distance',0)
                except: pass
            instr.append({"name": curr_n, "dist": curr_d})
        
        return {
            "path": [list(n) for n in path], 
            "instructions": instr, 
            "stats": {"real":{"time":t, "dist":d}, "delta":{"time":0,"dist":0}}
        }
    except: raise HTTPException(404, "Percorso non trovato (destinazione irraggiungibile)")

@app.post("/api/calculate-isochrone")
async def iso(r: IsoReq):
    """Calcola l'area raggiungibile in X minuti."""
    c = get_nearest_node(r.center[0], r.center[1])
    if not c: return {"type":"FeatureCollection", "features":[]}
    
    def flt(u,v,k): return G[u][v][k].get('road_id','') not in closed_streets
    view = nx.subgraph_view(G, filter_edge=flt)
    
    try:
        sub = nx.ego_graph(view, c, radius=r.minutes, distance='weight')
        pts = [Point(n[1],n[0]) for n in sub.nodes]
        return mapping(unary_union([p.buffer(0.003) for p in pts])) if pts else {"type":"FeatureCollection","features":[]}
    except: return {"type":"FeatureCollection", "features":[]}

@app.post("/api/toggle-closure/{rid}")
async def toggle(rid: str):
    """Attiva/Disattiva la chiusura di una strada specifica."""
    rid = str(unquote(rid)).strip().lower()
    if rid in closed_streets: closed_streets.remove(rid)
    else: closed_streets.add(rid)
    return {"current_closures": list(closed_streets)}

@app.post("/api/reset-closures")
async def reset():
    """Rimuove tutte le chiusure stradali attive."""
    closed_streets.clear()
    return {"status": "ok"}

# --- ENDPOINTS SCENARI (DATABASE) ---

@app.get("/api/scenarios")
async def get_sc():
    """Recupera la lista degli scenari salvati."""
    if db is None: return []
    try:
        l = await db.scenarios.find().to_list(100)
        return [{"_id": str(x["_id"]), "name": x["name"], "closed_ids": x.get("closed_ids",[])} for x in l]
    except: return []

@app.post("/api/scenarios")
async def add_sc(s: ScenarioReq):
    """Salva un nuovo scenario nel DB."""
    if db is None: raise HTTPException(503, "Database non disponibile")
    try:
        r = await db.scenarios.insert_one(s.dict())
        return {"_id": str(r.inserted_id)}
    except: raise HTTPException(500, "Errore durante il salvataggio")

@app.post("/api/scenarios/{sid}/apply")
async def apply_sc(sid: str):
    """Applica uno scenario salvato (carica le chiusure)."""
    global closed_streets
    if db is None: raise HTTPException(503, "Database non disponibile")
    try:
        x = await db.scenarios.find_one({"_id": ObjectId(sid)})
        if x: 
            closed_streets = set(x.get("closed_ids", []))
            return {"status": "applied", "count": len(closed_streets)}
        raise HTTPException(404, "Scenario non trovato")
    except: raise HTTPException(400, "ID Scenario non valido")

@app.delete("/api/scenarios/{sid}")
async def del_sc(sid: str):
    """Elimina uno scenario."""
    if db is None: raise HTTPException(503, "Database non disponibile")
    try:
        await db.scenarios.delete_one({"_id": ObjectId(sid)})
        return {"status": "deleted"}
    except: raise HTTPException(400, "ID Scenario non valido")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=4000, reload=True)