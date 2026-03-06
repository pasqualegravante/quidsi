import requests_model as body_model
import networkx as nx
from engine import GraphEngine
from typing import Annotated
from fastapi import Depends

GE = GraphEngine()

def get_scenario_graph(
    sreq: body_model.scenario_req
) -> nx.Graph:
    """
    Dependency che costruisce il grafo a partire dai parametri dello scenario.
    Viene eseguita automaticamente per ogni richiesta che la richiede.
    """

    return GE.build_scenario_graph(
        user_id=sreq.uid,
        scen_id=sreq.id,
        closed_segments=sreq.closed_segments,
        alfa=sreq.alfa,
        manual_weights=sreq.manual_weights or {}
    )

GraphDep = Annotated[nx.DiGraph, Depends(get_scenario_graph)]