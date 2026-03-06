from fastapi import APIRouter
from fastapi.responses import JSONResponse
import networkx as nx

import requests_model as body_model
from dependency import GE, GraphDep

router_edge = APIRouter(
    prefix="/edge"
)

@router_edge.post("/get-info")
async def info(sreq: body_model.edge_req, g: GraphDep):
    #tup = tuple(sreq.edges[0])
    res =  GE.get_edge_data(g, sreq.edges[0])
    return JSONResponse(
        status_code=res["code"],
        content=res["res"]
    )

@router_edge.delete("/delete")
async def delete(sreq: body_model.edge_req, g: GraphDep):
    res = GE.remove_edges(g, sreq.edges)
    return JSONResponse(
        status_code=res["code"],
        content=res["res"]
    )

@router_edge.post("/add")
async def add(sreq: body_model.edge_req, g: GraphDep):
    res = GE.add_edges(g, sreq.edges)
    return JSONResponse(
        status_code=res["code"],
        content=res["res"]
    )