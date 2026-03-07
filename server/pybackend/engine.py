import networkx as nx
import math
from typing import List, Dict, Tuple
from pathlib import Path
from translator import geojson_to_nx

class GraphEngine:
    def __init__(self):
        self.base_graph: nx.Graph = self._load_base_graph()

    def _load_base_graph(self) -> nx.Graph:
        return geojson_to_nx()

    def _get_nearest_node(self, G: nx.Graph, coords_str: str) -> str:
        try:
            req_x, req_y = map(float, coords_str.split())
        except:
            return coords_str 
            
        closest_node = None
        min_dist = float('inf')
        for node in G.nodes():
            try:
                nx_x, nx_y = map(float, str(node).split())
                dist = math.sqrt((req_x - nx_x)**2 + (req_y - nx_y)**2)
                if dist < min_dist:
                    min_dist = dist
                    closest_node = node
            except:
                continue
        return closest_node if closest_node else coords_str

    def build_scenario_graph(self, closed_segments: List[str], alfa: float, manual_weights: Dict[str, float]) -> nx.Graph:
        g = self.base_graph.copy()
        is_multi = g.is_multigraph()
        
        if not closed_segments:
            closed_segments = []
            
        for eid in closed_segments:
            edges_to_remove = []
            
            # 🔥 FIX: Nascondiamo la parola 'keys' se non è un multigraph
            edges_iterator = g.edges(data=True, keys=True) if is_multi else g.edges(data=True)
            
            for edge in edges_iterator:
                if str(edge[-1].get("edge_id")) == str(eid):
                    edges_to_remove.append(edge)
            
            for edge in edges_to_remove:
                if is_multi:
                    g.remove_edge(edge[0], edge[1], key=edge[2])
                else:
                    g.remove_edge(edge[0], edge[1])
        return g

    def compute_dijkstra(self, G: nx.Graph, source: str, target: str) -> List[Dict]:
        try:
            real_source = self._get_nearest_node(G, source)
            real_target = self._get_nearest_node(G, target)
            node_path = nx.dijkstra_path(G, real_source, real_target)
            return {"code": 200, "res": node_path}
        except nx.NetworkXNoPath:
            return {"code": 400, "res": []}
        except Exception as e:
            return {"code": 500, "res": []}

    def compute_scc(self, G: nx.DiGraph):
        return {"code": 200, "res": nx.number_strongly_connected_components(G)}
    
    def remove_edges(self, G: nx.Graph, edges_ids: List[str]):
        try:
            is_multi = G.is_multigraph()
            for eid in edges_ids:
                edges_to_remove = []
                
                # 🔥 FIX
                edges_iterator = G.edges(data=True, keys=True) if is_multi else G.edges(data=True)
                
                for edge in edges_iterator:
                    if str(edge[-1].get("edge_id")) == str(eid):
                        edges_to_remove.append(edge)
                
                for edge in edges_to_remove:
                    if is_multi:
                        G.remove_edge(edge[0], edge[1], key=edge[2])
                    else:
                        G.remove_edge(edge[0], edge[1])
            return {"code": 200, "res": "true"}
        except Exception as e:
            return {"code": 500, "res": f"Error: {e}"}

    def add_edges(self, G: nx.Graph, edges_ids: List[str]):
        try:
            is_multi = self.base_graph.is_multigraph()
            for eid in edges_ids:
                
                # 🔥 FIX
                edges_iterator = self.base_graph.edges(data=True, keys=True) if is_multi else self.base_graph.edges(data=True)
                
                for edge in edges_iterator:
                    if str(edge[-1].get("edge_id")) == str(eid):
                        if is_multi:
                            G.add_edge(edge[0], edge[1], key=edge[2], **edge[-1])
                        else:
                            G.add_edge(edge[0], edge[1], **edge[-1])
                        break
            return {"code": 200, "res": "true"}
        except Exception as e:
            return {"code": 500, "res": f"Error: {e}"}

    def get_edge_data(self, G: nx.Graph, edge_id: str):
        try:
            res = "None"
            is_multi = G.is_multigraph()
            
            # 🔥 FIX
            edges_iterator = G.edges(data=True, keys=True) if is_multi else G.edges(data=True)
            
            for edge in edges_iterator:
                if str(edge[-1].get("edge_id")) == str(edge_id):
                    res = edge[-1]
                    break
            return {"code": 200, "res": res}
        except Exception as e:
            return {"code": 500, "res": f"Error: {e}"}