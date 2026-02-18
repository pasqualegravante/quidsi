from sys import exit
from datetime import datetime, timedelta

import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, field_validator

import networkx as nx
from translator import csv_to_nx

from database import db_init, GraphMetadata

# ========================== STATE
DEAFAULT_GRAPH = csv_to_nx()
USER_GRAPH = dict()

# =========================== Connessione a MongoDB in fondo al file

# =========================== Crea l'app FastAPI
app = FastAPI(
    title="Graph API",
    description="",
    version="1.0.0"
)

# ========================== Body of requests definition through pydantic
class user_req(BaseModel):
    uid:str

class point_req(BaseModel):
    uid: user_req
    eid: str
    point: str
   
class edge_req(BaseModel):
    uid: user_req
    eid: str
    a: str
    b: str
    isnew: bool

class graph_req(BaseModel):
    uid: user_req
    gid: str

# ========================== API on /
@app.get("/")
async def root():
    return {"messaggio": "API ok, stampa funzionalità: ..."}

# ========================== API on /graph
@app.post("/graph/select")
async def graph_select(gbody: graph_req):
    gmeta = app.state.DBWRAPPER.graph_find(gbody.gid)

    if gmeta!=None:
        del USER_GRAPH[gbody.uid].graph
        del USER_GRAPH[gbody.uid]

        USER_GRAPH[gbody.uid]=gmeta
    
    # return msg
    
@app.post("/graph/duplicate")
async def graph_duplicate(gbody: graph_req):
    gmeta = app.state.DBWRAPPER.graph_find(gbody.gid)
    gmeta.gid=None

    # save graph in db
    app.state.DBWRAPPER.graph_save(gmeta)

@app.post("/graph/new")
async def graph_new(ubody: user_req):
    # save a graph with diff=0
    gmeta = GraphMetadata(gid=None, uid=ubody.uid, graph=DEAFAULT_GRAPH, last_access=datetime.now())
    app.state.DBWRAPPER.graph_save(gmeta)

@app.post("/graph/delete")
async def graph_delete(gbody: graph_req):
    # delete also object if active
    if USER_GRAPH[gbody.uid].gid==gbody.gid:
        del USER_GRAPH[gbody.uid].gid
    
    # delete from db
    app.state.DBWRAPPER.graph_delete(graph_req.gid, graph_req.uid)

# Avvio del server condizionato alla connessione con il DB o meno
if __name__ == "__main__":
    try:
        DBWRAPPER = db_init()
        print("Connessione MongoDB iniziale OK")

        # Avvia su loopback
        print("Avvio API su loopback (127.0.0.1)...")
        uvicorn.run(
            "main:app",
            host="127.0.0.1",
            port=8000,
            reload=True,
            workers=1
        )

        app.state.DBWRAPPER=DBWRAPPER

        # comunica al server node che tutto ok
    except Exception as e:
        print(f"Impossibile avviare API: {e}")
        exit(1)
        # comunica al server node che si ha errore