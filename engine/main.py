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
# G: Il grafo stradale (rete di nodi e archi).
# closed_streets: Set (lista univoca) degli ID delle strade chiuse.
G = nx.MultiDiGraph()
closed_streets = set()

# --- FUNZIONI DI SUPPORTO GEOMETRICO ---

def haversine_distance(coord1, coord2):
    """
    Calcola la distanza in metri tra due punti (lat, lon) sulla Terra.
    Necessaria perché la Terra è sferica, non piatta.
    """
    R = 6371000  # Raggio della Terra in metri
    lat1, lon1 = coord1
    lat2, lon2 = coord2
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return R * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))

def get_geometry_length(geometry):
    """
    Calcola la lunghezza reale di una strada (che può essere curva)
    sommando la distanza di tutti i suoi piccoli segmenti.
    """
    coords = list(geometry.coords)
    total = 0.0
    for i in range(len(coords) - 1):
        # Shapely usa (Lon, Lat), noi invertiamo in (Lat, Lon) per la formula
        total += haversine_distance((coords[i][1], coords[i][0]), (coords[i+1][1], coords[i+1][0]))
    return total

# --- LIFESPAN: CARICAMENTO ALL'AVVIO ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    global G
    try:
        print("[INFO] Avvio Engine: Caricamento Grafo...")
        # Carica il file GeoJSON che contiene le strade
        with open('grafo_optimized.geojson', 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Itera su ogni strada del file
        for feature in data['features']:
            p = feature['properties']
            geom = shape(feature['geometry'])
            
            # Estrazione ID e proprietà
            rid = str(p.get('desvia') or p.get('name') or p.get('id') or "unknown").strip()
            speed = float(p.get('speed', 30)) # Velocità default 30 km/h
            oneway = str(p.get('oneway') or p.get('sensouni')) == '1'
            
            # Calcolo Peso (Costo) dell'arco
            dist = get_geometry_length(geom)
            # Tempo (minuti) = (Distanza / Velocità m/s) / 60
            mins = (dist / (speed/3.6 if speed>0 else 8.3)) / 60.0
            
            # Creazione nodi e archi nel grafo
            coords = list(geom.coords)
            for i in range(len(coords) - 1):
                u = (round(coords[i][1], 5), round(coords[i][0], 5))
                v = (round(coords[i+1][1], 5), round(coords[i+1][0], 5))
                # Aggiunge l'arco andata
                G.add_edge(u, v, weight=mins, distance=dist, road_id=rid)
                # Se non è senso unico, aggiunge anche il ritorno
                if not oneway:
                    G.add_edge(v, u, weight=mins, distance=dist, road_id=rid)
                    
        print(f"[OK] Grafo pronto: {G.number_of_nodes()} nodi caricati.")
    except Exception as e:
        print(f"[ERRORE] Caricamento fallito: {e}")
    yield
    G.clear() # Pulizia alla chiusura

# Configurazione App e CORS (per permettere chiamate dal browser)
app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# --- MODELLI DATI (Input API) ---
class RouteRequest(BaseModel):
    start: List[float] # [lat, lon]
    end: List[float]

class IsochroneRequest(BaseModel):
    center: List[float]
    minutes: float

def get_stats(graph, path):
    """Calcola tempo totale e distanza totale di un percorso dato."""
    t, d = 0, 0
    for i in range(len(path) - 1):
        u, v = path[i], path[i+1]
        edge = graph[u][v][0]
        seg_dist = haversine_distance(u, v)
        d += seg_dist
        # Tempo proporzionale alla lunghezza del segmento
        t += edge.get('weight', 0) * (seg_dist / max(1, edge.get('distance', 1)))
    return t, d

# --- API 1: CALCOLO PERCORSO ---
@app.post("/calculate-route")
async def calculate_route(req: RouteRequest):
    try:
        # 1. Snapping: Trova il nodo del grafo più vicino al punto cliccato
        s_node = min(G.nodes, key=lambda n: (n[0]-req.start[0])**2 + (n[1]-req.start[1])**2)
        e_node = min(G.nodes, key=lambda n: (n[0]-req.end[0])**2 + (n[1]-req.end[1])**2)
        
        # 2. Percorso Ideale (Senza traffico/blocchi)
        try:
            p_ideal = nx.shortest_path(G, s_node, e_node, weight='weight')
            t_ideal, d_ideal = get_stats(G, p_ideal)
        except: raise HTTPException(404, "Destinazione irraggiungibile nel grafo ideale")

        # 3. Percorso Reale (Considerando le chiusure)
        # Filtro: Include l'arco solo se il suo ID NON è nella lista chiusure
        def flt(u, v, k): 
            return G[u][v][k].get('road_id', '') not in closed_streets
            
        view = nx.subgraph_view(G, filter_edge=flt)
        
        try:
            p_real = nx.shortest_path(view, s_node, e_node, weight='weight')
            t_real, d_real = get_stats(G, p_real)
        except: 
            raise HTTPException(404, "Percorso bloccato dalle chiusure")

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

# --- API 2: CALCOLO ISOCRONA ---
@app.post("/calculate-isochrone")
async def calculate_isochrone(req: IsochroneRequest):
    try:
        # Trova il nodo centrale
        center = min(G.nodes, key=lambda n: (n[0]-req.center[0])**2 + (n[1]-req.center[1])**2)
        
        # Filtra le strade chiuse (l'isocrona deve fermarsi se la strada è chiusa)
        def flt(u, v, k): return G[u][v][k].get('road_id', '') not in closed_streets
        view = nx.subgraph_view(G, filter_edge=flt)
        
        # Algoritmo Ego Graph: Trova tutti i nodi entro X minuti
        sub = nx.ego_graph(view, center, radius=req.minutes, distance='weight')
        if len(sub.nodes) < 2: return {"type": "FeatureCollection", "features": []}
        
        # Crea il poligono unendo i buffer dei punti trovati
        pts = [Point(n[1], n[0]) for n in sub.nodes]
        poly = unary_union([p.buffer(0.0025) for p in pts]) # Buffer ~200 metri
        return mapping(poly)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, str(e))

# --- API 3: GESTIONE CHIUSURE ---
@app.post("/toggle-closure/{road_id}")
async def toggle(road_id: str):
    rid = unquote(road_id).strip()
    if rid in closed_streets: closed_streets.remove(rid)
    else: closed_streets.add(rid)
    return {"closed_count": len(closed_streets), "currently_closed": list(closed_streets)}

@app.post("/reset-closures")
async def reset():
    closed_streets.clear()
    return {"status": "ok"}