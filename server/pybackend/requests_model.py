from pydantic import BaseModel
from typing import List, Dict, Optional

class scenario_req(BaseModel):
    id: str
    uid: str
    closed_segments: List[str]
    alfa: Optional[float] = 0.5
    manual_weights: Optional[Dict[str, float]] = None

class dijkstra_req(scenario_req):
    source: str
    target: str