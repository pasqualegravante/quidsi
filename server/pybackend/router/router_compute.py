from fastapi import APIRouter
from fastapi.responses import JSONResponse

import requests_model as body_model
from dependency import GE, GraphDep

router_compute = APIRouter(
    prefix="/compute"
)

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