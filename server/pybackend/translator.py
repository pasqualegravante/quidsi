import json
import networkx as nx
import os

__all__ = ['geojson_to_nx']

def geojson_to_nx(geojson_path="grafo_web.geojson"):
    graph = nx.digraph.DiGraph()
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    full_path = os.path.join(base_dir, geojson_path)
    
    try:
        with open(full_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

            for feature in data.get("features", []):
                properties = feature.get("properties", {})
                geometry = feature.get("geometry", {})
                
                if geometry and geometry.get("type") == "LineString":
                    coords = geometry.get("coordinates", [])
                    sensouni = str(properties.get("sensouni", ""))
                    
                    for idx in range(len(coords) - 1):
                        nodeA = f"{coords[idx][0]} {coords[idx][1]}"
                        nodeB = f"{coords[idx+1][0]} {coords[idx+1][1]}"
                        
                        # 1. Creiamo sempre l'arco originale (Andata)
                        graph.add_edge(
                            nodeA, 
                            nodeB, 
                            edge_id=str(properties.get("id_arco")),
                            codice_via=properties.get("codice_via"), 
                            sensouni=sensouni, 
                            desvia=properties.get("desvia")
                        )
                        
                        # 2. 🔥 FIX: Se è a DOPPIO SENSO (0), creiamo anche il Ritorno!
                        if sensouni == "0":
                            graph.add_edge(
                                nodeB, 
                                nodeA, 
                                edge_id=str(properties.get("id_arco")),
                                codice_via=properties.get("codice_via"), 
                                sensouni=sensouni, 
                                desvia=properties.get("desvia")
                            )
                            
        print(f"✅ Grafo topologico generato! Nodi: {len(graph.nodes)} | Archi Diretti: {len(graph.edges)}")
    except Exception as e:
        print(f"\n[CRITICO] Impossibile leggere la mappa da {full_path}. Errore: {e}")
    
    return graph

def json_to_nx(data):
    pass

def nx_to_json(graph):
    pass