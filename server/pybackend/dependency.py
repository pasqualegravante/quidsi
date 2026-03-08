import requests_model as body_model
import networkx as nx
from engine import GraphEngine
from typing import Annotated
from fastapi import Depends
from scenario_cache import ScenarioCache
import time

GE = GraphEngine()
CACHE = ScenarioCache()

def get_scenario_graph(
    sreq: body_model.scenario_req
) -> nx.Graph:
    """
    Dependency che costruisce il grafo a partire dai parametri dello scenario.
    Viene eseguita automaticamente per ogni richiesta che la richiede.
    """
    g: nx.Graph = None

    scen = CACHE.get(sreq.user_id, sreq._id)
    if(scen):
        g=scen["graph"]
        CACHE.update(sreq.user_id, sreq._id, {"last_access": time.time()})

    else:
        g=GE.build_scenario_graph(
            closed_segments=sreq.closed_segments or [],
            alfa=sreq.alfa,
            manual_weights=sreq.manual_weights or []
        )
        CACHE.put(sreq.user_id, sreq._id, g, sreq.closed_segments, sreq.alfa, sreq.manual_weights)
    return g

GraphDep = Annotated[nx.DiGraph, Depends(get_scenario_graph)]