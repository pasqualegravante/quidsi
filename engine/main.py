from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import networkx as nx
import json
from shapely.geometry import shape
from pydantic import BaseModel
from typing import List
from urllib.parse import unquote
import math

# --- VARIABILI GLOBALI ---
G = nx.MultiDiGraph()
closed_streets = set()

# --- FORMULA HAVERSINE (Geometria Sferica) ---
def haversine_distance(coord1, coord2):
    """
    Calcola distanza in metri tra due coordinate (lon, lat) o (lat, lon).
    L'importante è che l'ordine sia coerente.
    """
    R = 6371000  # Raggio Terra in metri
    # Scompattiamo assumendo formato (lat, lon) dato che i nodi sono salvati così
    lat1, lon1 = coord1
    lat2, lon2 = coord2
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0) ** 2
    
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def get_geometry_length(geometry):
    """Calcola lunghezza reale in metri di una geometria GeoJSON"""
    coords = list(geometry.coords)
    total_meters = 0.0
    for i in range(len(coords) - 1):
        # GeoJSON standard è (lon, lat), la nostra func haversine si adatta
        # basta passare le tuple coerentemente.
        # coords[i] è (lon, lat)
        p1 = (coords[i][1], coords[i][0]) # invertiamo per avere (lat, lon)
        p2 = (coords[i+1][1], coords[i+1][0])
        total_meters += haversine_distance(p1, p2)
    return total_meters

# --- LIFESPAN (Avvio/Spegnimento) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    global G
    try:
        print("--- ENGINE AVVIATO: Caricamento Grafo... ---")
        with open('grafo_optimized.geojson', 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        for feature in data['features']:
            p = feature['properties']
            geom = shape(feature['geometry'])
            
            # ID Univoco
            raw_id = str(p.get('desvia') or p.get('name') or p.get('id') or p.get('osm_id') or "unknown")
            road_id = raw_id.strip()
            
            speed = float(p.get('speed', 30))
            is_oneway = str(p.get('oneway') or p.get('sensouni')) == '1'
            
            # Calcoli metrici precisi
            dist_meters = get_geometry_length(geom)
            speed_ms = speed / 3.6
            if speed_ms <= 0: speed_ms = 8.3
            
            time_minutes = (dist_meters / speed_ms) / 60.0

            coords = list(geom.coords)
            for i in range(len(coords) - 1):
                # Salviamo i nodi come (LAT, LON) arrotondati per coerenza con Leaflet
                u = (round(coords[i][1], 5), round(coords[i][0], 5))
                v = (round(coords[i+1][1], 5), round(coords[i+1][0], 5))
                
                G.add_edge(u, v, weight=time_minutes, distance=dist_meters, road_id=road_id)
                if not is_oneway:
                    G.add_edge(v, u, weight=time_minutes, distance=dist_meters, road_id=road_id)
                    
        print(f"✅ Grafo caricato: {G.number_of_nodes()} nodi.")
        
    except Exception as e:
        print(f"❌ ERRORE CRITICO: {e}")
    
    yield
    G.clear()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class RouteRequest(BaseModel):
    start: List[float] # [lat, lon]
    end: List[float]   # [lat, lon]

def get_path_stats(graph, path):
    total_time = 0
    total_dist = 0
    for i in range(len(path) - 1):
        u, v = path[i], path[i+1]
        edge_data = graph[u][v][0] 
        
        # Calcolo preciso distanza tra i due nodi del segmento
        segment_dist = haversine_distance(u, v)
        total_dist += segment_dist
        
        # Stima tempo proporzionale
        # (Peso Totale Arco * (Lunghezza Segmento / Lunghezza Totale Arco))
        edge_len = max(1, edge_data.get('distance', 1))
        total_time += edge_data.get('weight', 0) * (segment_dist / edge_len)

    return total_time, total_dist

@app.post("/calculate-route")
async def calculate_route(req: RouteRequest):
    if G.number_of_nodes() == 0:
        raise HTTPException(status_code=500, detail="Grafo non caricato")

    # 1. TROVA I NODI PIÙ VICINI (Snapping Logic)
    # Cerca il nodo nel grafo che ha la distanza euclidea minore dal click
    try:
        s_node = min(G.nodes, key=lambda n: (n[0]-req.start[0])**2 + (n[1]-req.start[1])**2)
        e_node = min(G.nodes, key=lambda n: (n[0]-req.end[0])**2 + (n[1]-req.end[1])**2)
    except ValueError:
        raise HTTPException(status_code=400, detail="Coordinate non valide")

    # 2. CALCOLO IDEALE
    try:
        path_ideal = nx.shortest_path(G, source=s_node, target=e_node, weight='weight')
        time_ideal, dist_ideal = get_path_stats(G, path_ideal)
    except nx.NetworkXNoPath:
        raise HTTPException(status_code=404, detail="Destinazione irraggiungibile")

    # 3. CALCOLO REALE (Con Chiusure)
    def filter_edges(u, v, k):
        return G[u][v][k]['road_id'] not in closed_streets

    view = nx.subgraph_view(G, filter_edge=filter_edges)
    
    try:
        path_real = nx.shortest_path(view, source=s_node, target=e_node, weight='weight')
        time_real, dist_real = get_path_stats(G, path_real)
    except nx.NetworkXNoPath:
        # Se bloccato, restituiamo comunque lo snapping ma senza percorso
        raise HTTPException(status_code=404, detail="Percorso bloccato dai cantieri")

    # 4. RISPOSTA
    delta_time = max(0, time_real - time_ideal)
    delta_dist = max(0, dist_real - dist_ideal)

    return {
        "path": [list(n) for n in path_real],
        # NUOVO: Restituiamo i punti esatti dove ci siamo agganciati
        "snapped_points": {
            "start": list(s_node),
            "end": list(e_node)
        },
        "stats": {
            "ideal": {"time": time_ideal, "dist": dist_ideal},
            "real":  {"time": time_real,  "dist": dist_real},
            "delta": {"time": delta_time, "dist": delta_dist}
        }
    }

@app.post("/toggle-closure/{road_id}")
async def toggle_closure(road_id: str):
    clean_id = unquote(road_id).strip()
    if clean_id in closed_streets:
        closed_streets.remove(clean_id)
    else:
        closed_streets.add(clean_id)
    return {"closed_count": len(closed_streets), "currently_closed": list(closed_streets)}

@app.post("/reset-closures")
async def reset_closures():
    closed_streets.clear()
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)