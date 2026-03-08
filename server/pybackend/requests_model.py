from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Tuple

class scenario_req(BaseModel):
    id: str = Field(alias="_id") 
    user_id: str
    closed_segments: Optional[List[Tuple[str, str]]] = []
    alfa: Optional[float] = 0.5
    manual_weights: Optional[Dict[str, float]] = None

class dijkstra_req(scenario_req):
    source: str
    target: str

class edge_req(scenario_req):
    edges: List[Tuple[str, str]]