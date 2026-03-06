import networkx as nx
from typing import List, Dict, Tuple
from pathlib import Path
from translator import csv_to_nx
from scenario_cache import ScenarioCache

class GraphEngine:
    def __init__(self):
        #self.base_graph_path = Path(base_graph_path)
        self.base_graph: nx.Graph = self._load_base_graph()
        self.sc_cache: ScenarioCache = ScenarioCache()

    def _load_base_graph(self) -> nx.Graph:
        return csv_to_nx()

    def build_scenario_graph(self,
                            user_id:str,
                            scen_id:str,
                            closed_segments: List[str], 
                            alfa: float, 
                            manual_weights: Dict[str, float]) -> nx.Graph:
        
        g: nx.Graph = None
        scen = self.sc_cache.get(user_id, scen_id)
    
        if(scen):
            g = scen["graph"]
        
        else:
            g = self.base_graph.copy()

            # 1. Rimuovi archi chiusi
            for eid in closed_segments:
                for u, v, k, data in list(g.edges(keys=True, data=True)):
                    if data.get("edge_id") == eid:
                        g.remove_edge(u, v, k)
                        break
            
            res = self.sc_cache.put(user_id, scen_id, g, closed_segments, alfa, manual_weights)
            if not res:
                g = None
        """
        # 2. Applica formula pesi
        for u, v, k, data in G.edges(keys=True, data=True):
            eid = data.get("edge_id")
            if eid in manual_weights:
                data["weight"] = manual_weights[eid]
            else:
                obj = data.get("objective_weight", 1.0)
                subj = data.get("subjective_weight", obj)  # fallback
                data["weight"] = obj * alfa + subj * (1 - alfa)
        """

        return g

    def compute_dijkstra(self, 
                         G : nx.Graph,
                         source: str,
                         target: str) -> List[Dict]:
        """Ritorna lista di edge del percorso (o [] se non esiste)"""

        # G = self._build_scenario_graph(closed_segments, alfa, manual_weights)
        
        try:
            node_path = nx.dijkstra_path(G, source, target)
            #potrà banalmente essere shortest_path, calcolo probabilmente più ottimizzato, leggiamo docuemntazione
            """edge_path = []
            for i in range(len(node_path)-1):
                u = node_path[i]
                v = node_path[i+1]
                edge_data = G.get_edge_data(u, v)
                # se MultiGraph prendi il primo (o gestisci key)
                if isinstance(edge_data, dict):
                    edge_data = list(edge_data.values())[0]
                edge_path.append({
                    "edge_id": edge_data.get("edge_id"),
                    "u": u,
                    "v": v,
                    "weight": edge_data.get("weight")
                })"""
            return {"code":200, "res":node_path}
        
        except nx.NetworkXNoPath:
            print("No path")
            return {"code":400, "res":[]}
        
        except Exception as e:
            print("Unexpected exception: ", e)
            return {"code":500, "res":[]}

    def compute_scc(self, G: nx.DiGraph):
        """Ritorna (num_cc, lista di liste di edge_id per componente)"""
        # G = self._build_scenario_graph(closed_segments, alfa, manual_weights or {})
        
        # Usiamo undirected per semplicità (strade bidirezionali)
        """if not isinstance(G, nx.Graph):
            G = G.to_undirected()"""
        
        # components = list(nx.strongly_connected_components(G))

        return {"code":200, "res":nx.number_strongly_connected_components(G)}
    
    def remove_edges(self, G: nx.DiGraph, edges: List[Tuple[str, str]]):
        try:
            for e in edges:
                G.remove_edge(e[0], e[1])
            return {"code":200, "res":"true"}
        
        except nx.NetworkXError as nxe:
            return {"code": 400, "res":f"Error: invalid edges: {nxe}"}
        except Exception as e:
            return {"code": 500, "res":f"Error: generic exception: {e}"}

    def add_edges(self, G: nx.DiGraph, edges: List[Tuple[str, str]]):
        try:
            G.add_edges_from(edges)
            return {"code":200, "res":"true"}
        
        except Exception as e:
            return {"code": 500, "res":f"Error: generic exception: {e}"}

    def get_edge_data(self, G: nx.DiGraph, edge: Tuple[str, str]):
        try:
            res = G.get_edge_data(edge[0], edge[1])
            if not res:
                res = "None"

            return {"code":200, "res":res}
        
        except Exception as e:
            return {"code": 500, "res":f"Error: generic exception: {e}"}
    
    def get_cache(self) -> ScenarioCache:
        return self.sc_cache
        
"""ge = GraphEngine()
print(ge.base_graph)

res = ge.compute_dijkstra(ge.base_graph, "664581.81 5101530.0", "664578.66 5101506.33")
nccs = ge.compute_scc(ge.base_graph)

print(ge.get_edge_data(ge.base_graph, ("664552.81 5104142.0", "664561.56 5104103.5")))
# print(res, nccs)"""
