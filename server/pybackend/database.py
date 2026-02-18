import io
from datetime import datetime
from typing import Dict, Any

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
            client('ping')  # Verifica connessione
            db = client.get_database(self.db_name)

            db.command({
                "collMod": "grafo",
                "validator": {
                    "$jsonSchema": {
                    "bsonType": "object",
                    "required": ["uid"],
                    }
                },
                "validationLevel": "moderate",
                "validationAction": "error"
            })

            return db
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            raise HTTPException(status_code=503, detail=f"Database non disponibile: {str(e)}")

# HANDLING OF GRAPH ENTITY
class GraphMetadata:
    def __init__(self, uid:str, gid:str, graph, last_access:datetime):
        self.uid=uid
        self.gid = gid
        self.graph = graph
        self.last_access = last_access # only used in-memory, not in db
    
    @classmethod
    def fromdocument(self, document: DocumentType):
        if not document: # should check for validity of document instead of simple `not document`
            return
        
        self.uid=document["uid"]
        self.gid=document["_id"]
        self.last_access = datetime.now()

        graphml_data = document["data"].decode('utf-8') # Estrai i bytes
        buffer = io.StringIO(graphml_data)
        self.graph = nx.read_graphml(buffer, node_type=str)
    
    def getdocument(self):
        buffer = io.BytesIO()  # O StringIO per testo
        nx.write_graphml(self.graph, buffer, encoding='utf-8', prettyprint=True)  # prettyprint per leggibilità
        buffer.seek(0)  # Riavvolgi per leggere
        graphml_bytes = buffer.read()
        graphml_str = graphml_bytes.decode('utf-8') 

        if self.gid==None:
            return {
                "uid": self.uid,
                "data": graphml_str
            }

        return {
            "uid": self.uid,
            "_id":self.gid,
            "data": graphml_str
        }

# QUIDSI DB Wrapper
class QuidsiWrapper:
    def __init__(self, db_quidsi: Database):
        self.grafo_collection = db_quidsi["grafo"]
        self.utente_collection = db_quidsi["utente"]

        """self.grafo_collection.create_index({"gid":1}, {"unique":True})
        self.utente_collection.create_index({"uid":1}, {"unique":True})"""

    async def graph_find(self, uid:str, gid:str) -> GraphMetadata:
        if gid==None:
            return None # throw error
        
        document = await self.grafo_collection.find_one({"_id":gid})
        print(document)
        
        if not document:
            raise ValueError("Grafo non trovato nel DB")
        
        if uid!=document["uid"]:
            raise ValueError("L'utente non può accedere a grafi altrui")
        
        gmeta = GraphMetadata.fromdocument(document)
        return gmeta

    async def graph_delete(self, uid:str, gid:str):
        if gid==None:
            return 0
        else:
            num_of_deleted_docs = await self.grafo_collection.delete_many({"_id":gid, "uid":uid})
            return num_of_deleted_docs

    async def graph_save(self, gmeta:GraphMetadata) -> DocumentType:
        if gmeta.graph==None or gmeta.gid==None:
            return False
        else:
            document = gmeta.getdocument()
            print(document["data"][:200])  # Anteprima XML
            original_doc = await self.grafo_collection.find_one_and_update(
                {"_id":document["_id"]},
                {"$set": {"data":document["data"]}}
            )

            if(original_doc==None): # No document has been updated 
                await self.grafo_collection.insert_one(document)
        
            return True

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

DBW = db_init()
DBW.graph_find("","")