from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import networkx as nx
import json
from shapely.geometry import shape, Point, mapping
from shapely.ops import unary_union
from pydantic import BaseModel
from typing import List
from urllib.parse import unquote
import math
import traceback

# --- STATO GLOBALE ---
G = nx.MultiDiGraph()
closed_streets = set()

# --- FUNZIONI DI SUPPORTO ---
def normalize_id(raw_id):
    """
    Pulisce l'ID per evitare errori di duplicazione o mismatch.
    Toglie spazi iniziali/finali e converte tutto in minuscolo.
    Es: " Via Roma " -> "via roma"
    """
    if not raw_id: return "unknown"
    return str(raw_id).strip().lower()

def haversine_distance(coord1, coord2):
    R = 6371000 
    lat1, lon1 = coord1
    lat2, lon2 = coord2
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return R * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))

def get_geometry_length(geometry):
    coords = list(geometry.coords)
    total = 0.0
    for i in range(len(coords) - 1):
        total += haversine_distance((coords[i][1], coords[i][0]), (coords[i+1][1], coords[i+1][0]))
    return total

# --- AVVIO ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    global G
    try:
        print("[INFO] Avvio Engine: Caricamento Grafo...")
        with open('grafo_optimized.geojson', 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        for feature in data['features']:
            p = feature['properties']
            geom = shape(feature['geometry'])
            
            # NORMALIZZAZIONE ID QUI
            raw_val = p.get('desvia') or p.get('name') or p.get('id') or "unknown"
            rid = normalize_id(raw_val)
            
            speed = float(p.get('speed', 30))
            oneway = str(p.get('oneway') or p.get('sensouni')) == '1'
            dist = get_geometry_length(geom)
            mins = (dist / (speed/3.6 if speed>0 else 8.3)) / 60.0
            
            coords = list(geom.coords)
            for i in range(len(coords) - 1):
                u = (round(coords[i][1], 5), round(coords[i][0], 5))
                v = (round(coords[i+1][1], 5), round(coords[i+1][0], 5))
                G.add_edge(u, v, weight=mins, distance=dist, road_id=rid)
                if not oneway:
                    G.add_edge(v, u, weight=mins, distance=dist, road_id=rid)
                    
        print(f"[OK] Grafo pronto: {G.number_of_nodes()} nodi. ID Normalizzati.")
    except Exception as e:
        print(f"[ERRORE] Caricamento fallito: {e}")
    yield
    G.clear()
    closed_streets.clear()

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class RouteRequest(BaseModel):
    start: List[float]
    end: List[float]

class IsochroneRequest(BaseModel):
    center: List[float]
    minutes: float

def get_stats(graph, path):
    t, d = 0, 0
    for i in range(len(path) - 1):
        u, v = path[i], path[i+1]
        edge = graph[u][v][0]
        seg_dist = haversine_distance(u, v)
        d += seg_dist
        t += edge.get('weight', 0) * (seg_dist / max(1, edge.get('distance', 1)))
    return t, d

# --- API ---

@app.post("/calculate-route")
async def calculate_route(req: RouteRequest):
    try:
        s_node = min(G.nodes, key=lambda n: (n[0]-req.start[0])**2 + (n[1]-req.start[1])**2)
        e_node = min(G.nodes, key=lambda n: (n[0]-req.end[0])**2 + (n[1]-req.end[1])**2)
        
        try:
            p_ideal = nx.shortest_path(G, s_node, e_node, weight='weight')
            t_ideal, d_ideal = get_stats(G, p_ideal)
        except: raise HTTPException(404, "Destinazione irraggiungibile")

        # FILTRO ROBUSTO: Usa normalizzazione implicita (i dati in G sono già normalizzati)
        def flt(u, v, k): 
            return G[u][v][k].get('road_id', '') not in closed_streets
            
        view = nx.subgraph_view(G, filter_edge=flt)
        
        try:
            p_real = nx.shortest_path(view, s_node, e_node, weight='weight')
            t_real, d_real = get_stats(G, p_real)
        except: 
            raise HTTPException(404, "Percorso bloccato")

        return {
            "path": [list(n) for n in p_real],
            "snapped_points": {"start": list(s_node), "end": list(e_node)},
            "stats": {
                "ideal": {"time": t_ideal, "dist": d_ideal},
                "real": {"time": t_real, "dist": d_real},
                "delta": {"time": max(0, t_real-t_ideal), "dist": max(0, d_real-d_ideal)}
            }
        }
    except HTTPException as he: raise he
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, str(e))

@app.post("/calculate-isochrone")
async def calculate_isochrone(req: IsochroneRequest):
    try:
        center = min(G.nodes, key=lambda n: (n[0]-req.center[0])**2 + (n[1]-req.center[1])**2)
        
        def flt(u, v, k): return G[u][v][k].get('road_id', '') not in closed_streets
        view = nx.subgraph_view(G, filter_edge=flt)
        
        sub = nx.ego_graph(view, center, radius=req.minutes, distance='weight')
        if len(sub.nodes) < 2: return {"type": "FeatureCollection", "features": []}
        
        pts = [Point(n[1], n[0]) for n in sub.nodes]
        poly = unary_union([p.buffer(0.0025) for p in pts])
        return mapping(poly)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, str(e))

@app.post("/toggle-closure/{road_id}")
async def toggle(road_id: str):
    # NORMALIZZAZIONE ANCHE QUI
    # Decodifica URL -> togli spazi -> minuscolo
    rid = normalize_id(unquote(road_id))
    
    status = "aperta"
    if rid in closed_streets: 
        closed_streets.remove(rid)
        status = "aperta"
    else: 
        closed_streets.add(rid)
        status = "chiusa"
    
    print(f"[INFO] Toggle Strada: '{rid}' -> {status}. Totale chiuse: {len(closed_streets)}")
    # Restituisce al frontend la lista originale (non serve che il frontend sappia che è minuscolo, basta che gli ID coincidano)
    return {"closed_count": len(closed_streets), "currently_closed": list(closed_streets)}

@app.post("/reset-closures")
async def reset():
    closed_streets.clear()
    print("[INFO] Reset Chiusure: Tutte le strade riaperte.")
    return {"status": "ok"}