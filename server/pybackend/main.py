from sys import exit
from datetime import datetime, timedelta
from bson import ObjectId

import uvicorn
from fastapi import FastAPI, Depends
from pydantic import BaseModel

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
    eid: str
    point: str
   
class edge_req(BaseModel):
    uid:str
    eid: str
    a: str
    b: str
    # isnew: bool, per ora non serve

class graph_req(BaseModel):
    uid: str
    gid: str

def document_to_payload(document: DocumentType, field_to_stringify:list[str]) -> DocumentType:
    if field_to_stringify[0]=="all":
        for k,v in document:
            document[k]=str(document[k])
    
    for field in field_to_stringify:     
        if field in document:
            document[field]=str(document[field])
    
    return document

# =========================== Crea l'app FastAPI
app = FastAPI(
    title="Graph API",
    description="",
    version="1.0.0"
)

# ========================== API on /
@app.get("/")
def root():
    return {"messaggio": "API ok, stampa funzionalità: ..."}

# ========================== API on /graph
@app.post("/graph/select")
def graph_select(gbody: graph_req, DBW: QuidsiWrapper = Depends(db_init)):
    gmeta = DBW.graph_find(uid=ObjectId(gbody.uid), gid=ObjectId(gbody.gid))
    
    if gmeta!=None:
        if gbody.uid in USER_GRAPH:
            if USER_GRAPH[gbody.uid].graph:
                del USER_GRAPH[gbody.uid].graph
            
            del USER_GRAPH[gbody.uid]

        USER_GRAPH[gbody.uid]=gmeta
    
    return {"gid":str(USER_GRAPH[gbody.uid].gid)}
    
@app.post("/graph/duplicate")
def graph_duplicate(gbody: graph_req, DBW: QuidsiWrapper = Depends(db_init)):
    gmeta = DBW.graph_find(uid=ObjectId(gbody.uid), gid=ObjectId(gbody.gid))
    gmeta.gid=None

    # save graph in db
    document = DBW.graph_save(gmeta)
    return document_to_payload(document, ["uid", "_id", "gid", "data"])

@app.post("/graph/new")
def graph_new(ubody: user_req, DBW: QuidsiWrapper = Depends(db_init)):
    gmeta = GraphMetadata(gid=None, uid=ObjectId(ubody.uid), graph=DEAFAULT_GRAPH, last_access=datetime.now())
    document = DBW.graph_save(gmeta)

    return document_to_payload(document, ["uid", "_id", "gid", "data"])

@app.post("/graph/delete")
def graph_delete(gbody: graph_req, DBW: QuidsiWrapper = Depends(db_init)):
    # delete also object if active
    if gbody.uid in USER_GRAPH:
        if USER_GRAPH[gbody.uid].gid==ObjectId(gbody.gid):
            del USER_GRAPH[gbody.uid].graph
            del USER_GRAPH[gbody.uid]
        
    # delete from db
    deleted_gid = DBW.graph_delete(uid=ObjectId(gbody.uid), gid=ObjectId(gbody.gid))
    return {"gid":str(deleted_gid)}

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