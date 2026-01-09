from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import networkx as nx
import json
from shapely.geometry import shape
from pydantic import BaseModel
from typing import List
from urllib.parse import unquote # Importato qui per sicurezza

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

G = nx.MultiDiGraph()
closed_streets = set()

@app.on_event("startup")
async def load_graph():
    global G
    try:
        with open('grafo_optimized.geojson', 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f"--- CARICAMENTO GRAFO ---")
        for feature in data['features']:
            p = feature['properties']
            geom = shape(feature['geometry'])
            
            # --- NORMALIZZAZIONE ID ---
            # Prendiamo il nome o l'ID e rimuoviamo spazi bianchi inizio/fine
            raw_id = str(p.get('desvia') or p.get('name') or p.get('id') or p.get('osm_id') or "unknown")
            road_id = raw_id.strip() 
            
            speed = float(p.get('speed', 30))
            is_oneway = str(p.get('oneway') or p.get('sensouni')) == '1'
            dist_total = geom.length
            time_cost = dist_total / (speed / 3.6)
            
            coords = list(geom.coords)
            for i in range(len(coords) - 1):
                u = (round(coords[i][1], 4), round(coords[i][0], 4))
                v = (round(coords[i+1][1], 4), round(coords[i+1][0], 4))
                
                # Salviamo l'ID pulito nell'arco
                G.add_edge(u, v, weight=time_cost, road_id=road_id)
                if not is_oneway:
                    G.add_edge(v, u, weight=time_cost, road_id=road_id)
                    
        print(f"Grafo caricato: {G.number_of_nodes()} nodi.")
        print(f"-------------------------")
        
    except Exception as e:
        print(f"ERRORE CRITICO STARTUP: {e}")

class RouteRequest(BaseModel):
    start: List[float]
    end: List[float]

@app.post("/calculate-route")
async def calculate_route(req: RouteRequest):
    print(f"Calcolo percorso... Strade chiuse attuali: {closed_streets}")
    
    # Funzione filtro che ignora le strade chiuse
    def filter_edges(u, v, k):
        edge_id = G[u][v][k]['road_id']
        # Se l'ID è nella lista nera, ritorna False (arco rimosso)
        if edge_id in closed_streets:
            return False
        return True

    # Crea una vista temporanea del grafo filtrato
    view = nx.subgraph_view(G, filter_edge=filter_edges)
    
    try:
        # Trova nodi più vicini
        s_node = min(G.nodes, key=lambda n: (n[0]-req.start[0])**2 + (n[1]-req.start[1])**2)
        e_node = min(G.nodes, key=lambda n: (n[0]-req.end[0])**2 + (n[1]-req.end[1])**2)
        
        # Calcola percorso sulla vista filtrata
        path = nx.shortest_path(view, source=s_node, target=e_node, weight='weight')
        return {"path": [list(n) for n in path]}
        
    except nx.NetworkXNoPath:
        print("PERCORSO BLOCCATO: Non esiste una strada alternativa.")
        raise HTTPException(status_code=404, detail="Nessun percorso possibile con queste chiusure.")
    except Exception as e:
        print(f"Errore calcolo: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/toggle-closure/{road_id}")
async def toggle_closure(road_id: str):
    # Decodifica e pulisce l'ID ricevuto dal frontend
    clean_id = unquote(road_id).strip()
    
    if clean_id in closed_streets:
        closed_streets.remove(clean_id)
        print(f"RIAPERTA: '{clean_id}'")
    else:
        closed_streets.add(clean_id)
        print(f"CHIUSA: '{clean_id}'")
        
    return {"closed_count": len(closed_streets), "currently_closed": list(closed_streets)}

@app.post("/reset-closures")
async def reset_closures():
    closed_streets.clear()
    print("RESET TOTALE CHIUSURE")
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)