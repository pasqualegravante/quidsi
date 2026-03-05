from fastapi import FastAPI
import uvicorn
from router.router_compute import router_compute

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Hello World"}

app.include_router(router_compute)

# Avvio del server condizionato alla connessione con il DB
if __name__ == "__main__":
    try:
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