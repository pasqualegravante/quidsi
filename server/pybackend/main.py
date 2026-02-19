from sys import exit
from datetime import datetime, timedelta
from bson import ObjectId

import uvicorn
from fastapi import FastAPI, Depends
from pydantic import BaseModel
from typing import Optional

import networkx as nx
from translator import csv_to_nx

from database import db_init, GraphMetadata, QuidsiWrapper, DocumentType

# ========================== STATE
DEAFAULT_GRAPH = csv_to_nx()
USER_GRAPH = dict()

# ========================== Body of requests definition through pydantic
class user_req(BaseModel):
    uid: str

class point_req(BaseModel):
    uid: str
    gid: str
    point: str
   
class edge_req(BaseModel):
    uid:str
    gid: str
    point_list: list[list[str]]
    attr: Optional[str] = None
    # isnew: bool, per ora non serve

class graph_req(BaseModel):
    uid: str
    gid: str

def document_to_payload(document: DocumentType, field_to_stringify:list[str]) -> DocumentType:
    if document==None:
        return {"msg":"no document"}
    
    payload = document.copy()
    if field_to_stringify[0]=="all":
        for k,v in payload:
            payload[k]=str(payload[k])
    
    for field in field_to_stringify:     
        if field in payload:
            payload[field]=str(payload[field])
    
    return payload

# =========================== Crea l'app FastAPI
app = FastAPI(
    title="Graph API",
    description="",
    version="1.0.0"
)

# ========================== API on /
@app.get("/engine")
def root():
    return {"messaggio": "API ok, stampa funzionalità: ..."}

# ========================== API on /graph
@app.post("/engine/graph/select")
def graph_select(body: graph_req, DBW: QuidsiWrapper = Depends(db_init)):
    gmeta = DBW.graph_find(uid=ObjectId(body.uid), gid=ObjectId(body.gid))
    
    if gmeta!=None:
        if body.uid in USER_GRAPH:
            if USER_GRAPH[body.uid].graph:
                del USER_GRAPH[body.uid].graph
            
            del USER_GRAPH[body.uid]

        USER_GRAPH[body.uid]=gmeta
    
    return {"gid":str(USER_GRAPH[body.uid].gid)}
    
@app.post("/engine/graph/duplicate")
def graph_duplicate(body: graph_req, DBW: QuidsiWrapper = Depends(db_init)):
    gmeta = DBW.graph_find(uid=ObjectId(body.uid), gid=ObjectId(body.gid))
    gmeta.gid=None

    # save graph in db
    document = DBW.graph_save(gmeta)
    return document_to_payload(document, ["uid", "_id", "gid", "data"])

@app.post("/engine/graph/new")
def graph_new(ubody: user_req, DBW: QuidsiWrapper = Depends(db_init)):
    gmeta = GraphMetadata(gid=None, uid=ObjectId(ubody.uid), graph=DEAFAULT_GRAPH, last_access=datetime.now())
    document = DBW.graph_save(gmeta)

    return document_to_payload(document, ["uid", "_id", "gid", "data"])

@app.post("/engine/graph/delete")
def graph_delete(body: graph_req, DBW: QuidsiWrapper = Depends(db_init)):
    # delete also object if active
    if body.uid in USER_GRAPH:
        if USER_GRAPH[body.uid].gid==ObjectId(body.gid):
            del USER_GRAPH[body.uid].graph
            del USER_GRAPH[body.uid]
        
    # delete from db
    deleted_gid = DBW.graph_delete(uid=ObjectId(body.uid), gid=ObjectId(body.gid))
    return {"gid":str(deleted_gid)}

@app.post("/engine/graph/edge/delete")
def graph_delete(body: edge_req, DBW: QuidsiWrapper = Depends(db_init)):
    # delete also object if active
    document = None
    if body.uid in USER_GRAPH:
        if USER_GRAPH[body.uid].gid==ObjectId(body.gid):
            graph:nx.DiGraph = USER_GRAPH[body.uid].graph
            predelete = graph.size()
            try:
                pl = body.point_list
                for i in range(1, len(body.point_list)):
                    if(graph.has_edge(pl[i-1][0], pl[i][0])):
                        graph.remove_edge(pl[i-1][0], pl[i][0])
            except Exception as e:
                print(e)
                return {"error":str(e)}
            
            if graph.size()<predelete:
                document = DBW.graph_save(USER_GRAPH[body.uid])
    
    return document_to_payload(document, ["uid", "_id", "gid", "data"])

@app.post("/engine/graph/edge/getinfo")
def graph_getinfo(body: edge_req):
    attr = None
    
    if body.uid in USER_GRAPH:
        if USER_GRAPH[body.uid].gid==ObjectId(body.gid):
            graph:nx.DiGraph = USER_GRAPH[body.uid].graph
            try:
                pl = body.point_list
                attr_all = nx.get_edge_attributes(graph, body.attr)
                attr = attr_all[(pl[0][0], pl[1][0])]

            except Exception as e:
                print(e)
                return {"error":str(e)}
    
    return {"_id":body.gid, "uid":body.uid, str(body.attr):str(attr)}

@app.post("/engine/graph/dijkstra")
def graph_dijkstra(body: edge_req):
    path = None
    
    if body.uid in USER_GRAPH:
        if USER_GRAPH[body.uid].gid==ObjectId(body.gid):
            graph:nx.DiGraph = USER_GRAPH[body.uid].graph
            try:
                pl = body.point_list
                path = nx.dijkstra_path(graph, pl[0][0], pl[1][0])
                print(path)
            except Exception as e:
                print(e)
                return {"error":str(e)}
    
    return {"_id":body.gid, "uid":body.uid, "path":path}

# Avvio del server condizionato alla connessione con il DB
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

        # comunica al server node che tutto ok
    except Exception as e:
        print(f"Impossibile avviare API: {e}")
        exit(1)
        # comunica al server node che si ha errore