from fastapi import APIRouter
from fastapi.responses import JSONResponse

import requests_model as body_model
from dependency import CACHE, GraphDep

router_scenario = APIRouter(
    prefix="/scenario"
)

@router_scenario.post("/is-in-cache")
async def isincache(sreq: body_model.scenario_req):
    res = CACHE.get(sreq.uid, sreq.id)

    return JSONResponse(
        status_code=200,
        content={"res":"true" if res else "false"}
    )

@router_scenario.post("/get-from-cache")
async def getfromcache(sreq: body_model.scenario_req):
    res = CACHE.get(sreq.uid, sreq.id).copy()
    res.pop("graph")
    return JSONResponse(
        status_code=200,
        content=res
    )

@router_scenario.post("/delete-from-cache")
async def deletefromcache(sreq: body_model.scenario_req):
    res = CACHE.invalidate(sreq.uid, sreq.id)
    return JSONResponse(
        status_code=200,
        content=res
    )

@router_scenario.post("/load")
async def load(sreq: body_model.scenario_req, g: GraphDep):
    res = CACHE.put(sreq.uid, sreq.id, g, sreq.closed_segments, sreq.alfa, sreq.manual_weights)
    return JSONResponse(
        status_code=200,
        content=res
    )