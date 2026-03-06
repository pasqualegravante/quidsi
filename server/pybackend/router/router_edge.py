from fastapi import APIRouter
from fastapi.responses import JSONResponse
from typing import List

import requests_model as body_model
from dependency import GE, CACHE, GraphDep

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
    if(res["res"]=="true"):
        oldState = CACHE.get(sreq.uid, sreq.id)
        CACHE.update(sreq.uid, sreq.id, {
            "closed_segments":oldState.get("closed_segments", []) + sreq.edges
        })

    return JSONResponse(
        status_code=res["code"],
        content=res["res"]
    )

@router_edge.post("/add")
async def add(sreq: body_model.edge_req, g: GraphDep):
    res = GE.add_edges(g, sreq.edges)
    if(res["res"]=="true"):
        old_closed: List[List[str]] = CACHE.get(sreq.uid, sreq.id).get("closed_segments", [])
        
        for seg in sreq.edges:
            if seg in old_closed:
                old_closed.remove(seg)
        
        CACHE.update(sreq.uid, sreq.id, {
            "closed_segments":old_closed
        })
    return JSONResponse(
        status_code=res["code"],
        content=res["res"]
    )