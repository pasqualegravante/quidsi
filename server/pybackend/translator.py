import json
import networkx as nx

# Esportiamo la nuova funzione invece di quella vecchia
__all__ = ['geojson_to_nx']

def geojson_to_nx(geojson_path="grafo_web.geojson"):
    graph = nx.digraph.DiGraph()
    
    try:
        # Apriamo il file GeoJSON
        with open(geojson_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

            # Iteriamo su tutte le strade (features)
            for feature in data.get("features", []):
                properties = feature.get("properties", {})
                geometry = feature.get("geometry", {})
                
                # Ci assicuriamo che sia una linea (strada)
                if geometry and geometry.get("type") == "LineString":
                    coords = geometry.get("coordinates", [])
                    
                    # Ogni coppia di punti consecutivi diventa un lato del grafo
                    for idx in range(len(coords) - 1):
                        
                        # Formattiamo le coordinate come "X Y" 
                        # per mantenere la retrocompatibilità con i vecchi calcoli WKT
                        nodeA = f"{coords[idx][0]} {coords[idx][1]}"
                        nodeB = f"{coords[idx+1][0]} {coords[idx+1][1]}"
                        
                        # Aggiungiamo l'arco con le proprietà corrette
                        graph.add_edge(
                            nodeA, 
                            nodeB, 
                            edge_id=properties.get("id_arco"),     # Necessario per i calcoli di Engine
                            codice_via=properties.get("codice_via"), 
                            sensouni=properties.get("sensouni"), 
                            desvia=properties.get("desvia")
                        )

    except Exception as e:
        print(f"\nERRORE nella costruzione del grafo dal file geojson: {e}")
        graph = 0
    
    return graph

# Le altre funzioni che avevi prima (vuote)
def json_to_nx(data):
    pass

def nx_to_json(graph):
    pass