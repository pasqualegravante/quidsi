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

# --- FORMULA HAVERSINE (Per distanze reali in metri) ---
def haversine_distance(coord1, coord2):
    """
    Calcola la distanza in metri tra due punti (lon, lat) usando la formula dell'Haversine.
    """
    R = 6371000  # Raggio della Terra in metri
    lon1, lat1 = coord1
    lon2, lat2 = coord2
    
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
    """Calcola la lunghezza totale di una LineString sommando i segmenti."""
    coords = list(geometry.coords)
    total_meters = 0.0
    for i in range(len(coords) - 1):
        total_meters += haversine_distance(coords[i], coords[i+1])
    return total_meters

# --- LIFESPAN MANAGER ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    global G
    try:
        print("--- AVVIO SISTEMA: CARICAMENTO GRAFO PRECISO ---")
        with open('grafo_optimized.geojson', 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        for feature in data['features']:
            p = feature['properties']
            geom = shape(feature['geometry'])
            
            # Pulizia ID
            raw_id = str(p.get('desvia') or p.get('name') or p.get('id') or p.get('osm_id') or "unknown")
            road_id = raw_id.strip()
            
            speed = float(p.get('speed', 30)) # km/h
            is_oneway = str(p.get('oneway') or p.get('sensouni')) == '1'
            
            # --- FIX DISTANZA REALE ---
            dist_meters = get_geometry_length(geom)
            
            # Calcolo tempo in secondi (metri / (kmh / 3.6)) -> poi convertiamo in minuti
            speed_ms = speed / 3.6
            if speed_ms <= 0: speed_ms = 8.3 # Fallback 30km/h
            
            time_seconds = dist_meters / speed_ms
            time_minutes = time_seconds / 60.0

            coords = list(geom.coords)
            for i in range(len(coords) - 1):
                u = (round(coords[i][1], 4), round(coords[i][0], 4))
                v = (round(coords[i+1][1], 4), round(coords[i+1][0], 4))
                
                # Salviamo Metri reali e Minuti reali
                G.add_edge(u, v, weight=time_minutes, distance=dist_meters, road_id=road_id)
                if not is_oneway:
                    G.add_edge(v, u, weight=time_minutes, distance=dist_meters, road_id=road_id)
                    
        print(f"✅ Grafo pronto: {G.number_of_nodes()} nodi. Calcoli geodetici attivi.")
        
    except Exception as e:
        print(f"❌ ERRORE STARTUP: {e}")
    
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
    start: List[float]
    end: List[float]

# Helper per sommare le statistiche del percorso
def get_path_stats(graph, path):
    total_time = 0
    total_dist = 0
    for i in range(len(path) - 1):
        u, v = path[i], path[i+1]
        # Prende il primo arco disponibile
        # Nota: Qui stiamo sommando la lunghezza INTERA dell'arco stradale per ogni segmento del grafo.
        # Per massima precisione dovremmo dividere il peso per il numero di segmenti, 
        # ma dato che NetworkX usa i nodi originali del geojson, questo è già abbastanza preciso.
        edge_data = graph[u][v][0] 
        
        # ATTENZIONE: Se un arco del grafo rappresenta l'INTERA via, sommarlo più volte è sbagliato.
        # Nel nostro caso, ogni coppia u,v è un piccolo segmento della geometria originale?
        # Dipende da come è fatto il GeoJSON. 
        # SOLUZIONE ROBUSTA: Ricalcoliamo la distanza euclidea/haversine tra i due nodi specifici del path.
        
        dist_segment = haversine_distance((u[1], u[0]), (v[1], v[0])) # u è (lat,lon), haversine vuole (lon,lat)
        total_dist += dist_segment
        
        # Stima tempo segmento
        total_time += edge_data.get('weight', 0) * (dist_segment / max(1, edge_data.get('distance', 1)))

    return total_time, total_dist

@app.post("/calculate-route")
async def calculate_route(req: RouteRequest):
    try:
        s_node = min(G.nodes, key=lambda n: (n[0]-req.start[0])**2 + (n[1]-req.start[1])**2)
        e_node = min(G.nodes, key=lambda n: (n[0]-req.end[0])**2 + (n[1]-req.end[1])**2)
    except ValueError:
         raise HTTPException(status_code=500, detail="Grafo non pronto")

    # Scenario IDEALE
    try:
        path_ideal = nx.shortest_path(G, source=s_node, target=e_node, weight='weight')
        time_ideal, dist_ideal = get_path_stats(G, path_ideal)
    except nx.NetworkXNoPath:
        raise HTTPException(status_code=404, detail="Irraggiungibile")

    # Scenario REALE
    def filter_edges(u, v, k):
        return G[u][v][k]['road_id'] not in closed_streets

    view = nx.subgraph_view(G, filter_edge=filter_edges)
    
    try:
        path_real = nx.shortest_path(view, source=s_node, target=e_node, weight='weight')
        time_real, dist_real = get_path_stats(G, path_real)
    except nx.NetworkXNoPath:
        raise HTTPException(status_code=404, detail="Bloccato dai cantieri")

    delta_time = max(0, time_real - time_ideal)
    delta_dist = max(0, dist_real - dist_ideal)

    return {
        "path": [list(n) for n in path_real],
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