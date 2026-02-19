import io
from datetime import datetime
from typing import Dict, Any

from bson import ObjectId
import gzip

import networkx.readwrite as nx

from fastapi.exceptions import HTTPException

from pymongo.database import Database
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

DocumentType = Dict[str, Any]

# CONNECTION TO QUIDSI DB
MONGODB_URI = "mongodb+srv://simple:vBhQ8WEuZ9zU7NGg@cluster0.kvaflan.mongodb.net/?appName=Cluster0"
DB_NAME = "quidsi"

class DBConnection:
    def __init__(self, mongodb_uri:str, db_name:str):
        self.mongodb_uri=mongodb_uri
        self.db_name=db_name
    
    def connect(self) -> Database:
        try:
            client = MongoClient(self.mongodb_uri, server_api=ServerApi('1'), serverSelectionTimeoutMS=2000)
            #client('ping')  # Verifica connessione
            db = client.get_database(self.db_name)

            db.command({
                "collMod": "grafo",
                "validator": {
                    "$jsonSchema": {
                        "bsonType": "object",
                        "required": ["uid"],
                        # "properties": {               # ← se vuoi aggiungere regole più precise
                        #     "uid": {"bsonType": "string"}
                        # },
                        # "additionalProperties": True
                    }
                },
                "validationLevel": "moderate",
                "validationAction": "error"
            })

            """ async version with motor, being deprecated soon
            client = AsyncIOMotorClient(
                self.mongodb_uri,
                serverSelectionTimeoutMS=2000
            )
            db = client[self.db_name]
            """
            return db
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            raise HTTPException(status_code=503, detail=f"Database non disponibile: {str(e)}")

# HANDLING OF GRAPH ENTITY
class GraphMetadata:
    def __init__(self, uid:ObjectId=None, gid:ObjectId=None, graph=None, last_access:datetime=None):
        self.uid=uid
        self.gid=gid
        self.graph=graph
        self.last_access=last_access # only used in-memory, not in db
    
    def fromdocument(self, document: DocumentType):
        if not document: # should check for validity of document instead of simple `not document`
            return
        
        self.uid=document["uid"]
        self.gid=document["_id"]
        self.last_access = datetime.now()

        graphml_data = document["data"]
        self.graph = nx.read_graphml(io.BytesIO(gzip.decompress(graphml_data)))
        #print(self.uid, self.gid, self.graph)
    
    def getdocument(self) -> DocumentType:
        #buffer = io.BytesIO()  # O StringIO per testo
        #nx.write_graphml(self.graph, buffer, encoding='utf-8', prettyprint=True)  # prettyprint per leggibilità
        #buffer.seek(0)  # Riavvolgi per leggere
        #graphml_bytes = buffer.read()
        buffer = io.BytesIO()

        # Scrivi grafo compresso nel buffer
        with gzip.GzipFile(fileobj=buffer, mode="wb") as gz:
            nx.write_graphml_lxml(self.graph, gz)
        buffer.seek(0)  # torna all'inizio

        graphml_byte=buffer.read()
        graphml_data=graphml_byte

        if self.gid==None:
            return {
                "uid": self.uid,
                "data": graphml_data
            }

        return {
            "uid": self.uid,
            "_id":self.gid,
            "data": graphml_data
        }

# QUIDSI DB Wrapper
class QuidsiWrapper:
    def __init__(self, db_quidsi: Database):
        self.grafo_collection = db_quidsi["grafo"]
        self.utente_collection = db_quidsi["utente"]

        """self.grafo_collection.create_index({"gid":1}, {"unique":True})
        self.utente_collection.create_index({"uid":1}, {"unique":True})"""

    def graph_find(self, uid:ObjectId, gid:ObjectId) -> GraphMetadata:
        if gid==None:
            return None # throw error
        
        document = self.grafo_collection.find_one({"_id":gid, "uid":uid})
        #print(document)
        
        if not document:
            raise ValueError("Grafo non trovato nel DB")
        
        gmeta = GraphMetadata()
        gmeta.fromdocument(document)
        return gmeta

    def graph_delete(self, uid:ObjectId, gid:ObjectId) -> ObjectId:
        if gid==None or uid==None:
            return None
        else:
            deletedResult = self.grafo_collection.delete_one({"_id":gid, "uid":uid})
            return gid if deletedResult.deleted_count>0 else None
            

    def graph_save(self, gmeta:GraphMetadata) -> DocumentType:
        if gmeta.graph==None:
            return None
        else:
            document = gmeta.getdocument()
            if(gmeta.gid==None):
                print("inserimento senza id")
                self.grafo_collection.insert_one(document)

            else:
                original_doc = self.grafo_collection.find_one_and_update(
                    {"_id":document["_id"]},
                    {"$set": {"data":document["data"]}}
                )
        
            return document

def db_init() -> QuidsiWrapper:
    try:
        DB_CONN = DBConnection(MONGODB_URI, DB_NAME)
        DB = DB_CONN.connect()
        DBWRAPPER = QuidsiWrapper(DB)

        return DBWRAPPER
    
    except Exception as e:
        raise e
    
"""
possibile meccanismo utile per evitare di scrivere "gid", "uid", dato che si potrebbe cambiare il nome
in ad esempio "graph_id", dunque per modularità meglio mantenere una costante/funzione che mappa il cosiddetto gid al nome effettivo della proprietà nel documento mongo("gid" ad es.)
# handle Graph in db
class QueryGen:
    def __init__(self):
        pass

    def graph_query_gid(gid:str):
        return {"gid":gid}
    
    def graph_query_data(data:str):
        return {"data":data}
    
    def graph_query_uid(uid:str):
        return {"uid":uid}
"""

"""DBW = db_init()
print("Connessione ok")
res = DBW.graph_find("","")
print(res)"""