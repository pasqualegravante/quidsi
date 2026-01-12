"""
QuidEngine Backend - v2.1 (Fix Km & Scenarios)
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

# --- LIBRERIE OPZIONALI ---
try:
    from geopy.distance import geodesic
except ImportError:
    geodesic = None
    logger.warning("Geopy non trovato. Usato fallback euclideo.")

# --- DATABASE ---
# Importante: questo deve corrispondere al nome del servizio nel docker-compose ("database")
MONGO_URL = os.getenv("MONGO_URL", "mongodb://database:27017")
db = None

try:
    from motor.motor_asyncio import AsyncIOMotorClient
    from bson import ObjectId
    client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=5000)
    db = client.quidsi
    logger.info(f"Tentativo connessione Mongo su: {MONGO_URL}")
except Exception as e:
    logger.error(f"Errore inizializzazione Client Mongo: {e}")

# --- STATO GLOBALE ---
G = nx.MultiDiGraph()
closed_streets = set()
spatial_grid = defaultdict(list)
GRID_SIZE = 0.005

# --- CALCOLO DISTANZA (CORRETTO) ---
def calculate_segment_distance(p1, p2):
    """
    Calcola la distanza tra due punti specifici (non l'intera geometria).
    Rileva automaticamente se usare Metri o Gradi.
    """
    # Se le coordinate sono grandi (>180), sono già in Metri (WebMercator/UTM)
    if abs(p1[0]) > 180 or abs(p1[1]) > 180:
        return math.sqrt((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2)
    
    # Altrimenti sono Gradi (Lat/Lon)
    if geodesic:
        try:
            # Geopy vuole (Lat, Lon), Shapely dà (Lon, Lat)
            return geodesic((p1[1], p1[0]), (p2[1], p2[0])).meters
        except ValueError:
            pass # Fallback sotto
            
    # Fallback matematico (approx per l'Italia)
    # 1 grado lat ~= 111.32 km
    d_lat = (p1[1] - p2[1]) * 111320
    # 1 grado lon dipende dalla latitudine (coseno)
    d_lon = (p1[0] - p2[0]) * 111320 * math.cos(math.radians(p1[1]))
    return math.sqrt(d_lat**2 + d_lon**2)

def get_nearest_node(lat, lon):
    try:
        gx, gy = int(lat/GRID_SIZE), int(lon/GRID_SIZE)
        cands = []
        for i in range(gx-1, gx+2):
            for j in range(gy-1, gy+2):
                cands.extend(spatial_grid.get((i,j), []))
        if not cands: cands = list(G.nodes)
        if not cands: return None
        
        # Correzione sferica veloce
        lat_corr = 1.0 if abs(lat) > 180 else math.cos(math.radians(lat))
        return min(cands, key=lambda n: (n[0]-lat)**2 + ((n[1]-lon)*lat_corr)**2)
    except: return None

# --- LIFESPAN ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    global G, spatial_grid
    
    # 1. Caricamento Grafo
    G = nx.MultiDiGraph()
    spatial_grid = defaultdict(list)
    
    if os.path.exists('grafo_optimized.geojson'):
        try:
            with open('grafo_optimized.geojson', 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            count = 0
            for f in data['features']:
                try:
                    p = f['properties']
                    geom = shape(f['geometry'])
                    rid = str(p.get('name') or p.get('desvia') or "unknown").strip().lower()
                    speed = max(float(p.get('speed', 30)), 10.0)
                    oneway = str(p.get('oneway') or 0).lower() in ['1', 'yes', 'true']

                    # Gestione segmenti
                    parts = [geom] if geom.geom_type == 'LineString' else (geom.geoms if geom.geom_type == 'MultiLineString' else [])
                    
                    for part in parts:
                        coords = list(part.coords)
                        for i in range(len(coords)-1):
                            u = (coords[i][1], coords[i][0]) # Lon, Lat -> y, x
                            v = (coords[i+1][1], coords[i+1][0])
                            
                            # FIX CRUCIALE: Calcoliamo la distanza SOLO di questo segmento
                            dist_seg = calculate_segment_distance(coords[i], coords[i+1])
                            
                            # Peso in minuti
                            mins_seg = (dist_seg / (speed/3.6)) / 60.0
                            
                            G.add_edge(u, v, weight=mins_seg, distance=dist_seg, road_id=rid)
                            if not oneway: 
                                G.add_edge(v, u, weight=mins_seg, distance=dist_seg, road_id=rid)
                    count += 1
                except: pass
            
            # Indexing
            for n in G.nodes: spatial_grid[(int(n[0]/GRID_SIZE), int(n[1]/GRID_SIZE))].append(n)
            logger.info(f"Grafo caricato: {len(G.nodes)} nodi. KM corretti.")
        except Exception as e:
            logger.error(f"Errore caricamento GeoJSON: {e}")
    
    # 2. Check DB
    if db is not None:
        try:
            await db.command("ping")
            logger.info("MONGODB: CONNESSO E OPERATIVO")
        except Exception as e:
            logger.error(f"MONGODB: ERRORE CONNESSIONE: {e}")
    
    yield
    G.clear()

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# --- MODELLI ---
class RouteReq(BaseModel):
    start: List[float]
    end: List[float]
class IsoReq(BaseModel):
    center: List[float]
    minutes: float
class ScenarioReq(BaseModel):
    name: str
    closed_ids: List[str]

# --- ENDPOINTS ---
@app.get("/")
def root(): return {"status": "ok", "db": db is not None}

@app.post("/api/calculate-route")
async def route(r: RouteReq):
    s, e = get_nearest_node(r.start[0], r.start[1]), get_nearest_node(r.end[0], r.end[1])
    if not s or not e: raise HTTPException(400, "Fuori mappa")
    
    def flt(u,v,k): 
        try: return G[u][v][k].get('road_id','') not in closed_streets
        except: return True
    view = nx.subgraph_view(G, filter_edge=flt)

    try:
        path = nx.shortest_path(view, s, e, weight='weight')
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
        
        return {"path": [list(n) for n in path], "instructions": instr, "stats": {"real":{"time":t, "dist":d}, "delta":{"time":0,"dist":0}}}
    except: raise HTTPException(404, "Percorso non trovato")

@app.post("/api/calculate-isochrone")
async def iso(r: IsoReq):
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
    rid = str(unquote(rid)).strip().lower()
    if rid in closed_streets: closed_streets.remove(rid)
    else: closed_streets.add(rid)
    return {"current": list(closed_streets)}

@app.post("/api/reset-closures")
async def reset():
    closed_streets.clear()
    return {"status": "ok"}

# --- ENDPOINTS SCENARI ---
@app.get("/api/scenarios")
async def get_sc():
    if db is None: return []
    try:
        # Recupera e converte _id in stringa per il frontend
        l = await db.scenarios.find().to_list(100)
        return [{"_id": str(x["_id"]), "name": x["name"], "closed_ids": x.get("closed_ids",[])} for x in l]
    except Exception as e:
        logger.error(f"Errore lettura Scenari: {e}")
        return []

@app.post("/api/scenarios")
async def add_sc(s: ScenarioReq):
    if db is None: raise HTTPException(503, "DB Offline")
    try:
        r = await db.scenarios.insert_one(s.dict())
        return {"_id": str(r.inserted_id)}
    except: raise HTTPException(500, "Errore salvataggio")

@app.post("/api/scenarios/{sid}/apply")
async def apply_sc(sid: str):
    global closed_streets
    if db is None: raise HTTPException(503, "DB Offline")
    try:
        x = await db.scenarios.find_one({"_id": ObjectId(sid)})
        if x: 
            closed_streets = set(x.get("closed_ids", []))
            return {"status": "applied", "count": len(closed_streets)}
        raise HTTPException(404, "Scenario non trovato")
    except: raise HTTPException(400, "ID Invalido")

@app.delete("/api/scenarios/{sid}")
async def del_sc(sid: str):
    if db is None: raise HTTPException(503, "DB Offline")
    try:
        await db.scenarios.delete_one({"_id": ObjectId(sid)})
        return {"status": "deleted"}
    except: raise HTTPException(400, "ID Invalido")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=4000, reload=True)