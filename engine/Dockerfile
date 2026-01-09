# /engine/Dockerfile
FROM python:3.9-slim

WORKDIR /app

# Installa le librerie necessarie
RUN pip install fastapi uvicorn networkx shapely requests

# Copia il codice e il file geojson
COPY . .

# Avvia il server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]