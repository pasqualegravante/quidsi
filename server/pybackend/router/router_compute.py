from fastapi import APIRouter, Body, Depends
from fastapi.responses import JSONResponse
import networkx as nx

from engine import GraphEngine
import requests_model as body_model
from typing import Annotated

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

router_compute = APIRouter(
    prefix="/compute"
)

GraphDep = Annotated[nx.DiGraph, Depends(get_scenario_graph)]

@router_compute.get("")
async def info():
    return {"info":"ok"}

@router_compute.post("/dijkstra")
async def dijkstra(sreq: body_model.dijkstra_req, g: GraphDep):
    res = GE.compute_dijkstra(g, sreq.source, sreq.target)
    return JSONResponse(
        status_code=res["code"],
        content=res["res"]
    )

@router_compute.post("/scc")
async def scc(g: GraphDep):
    res = GE.compute_scc(g)
    return JSONResponse(
        status_code=res["code"],
        content=res["res"]
    )