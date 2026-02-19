FROM python:3.10-slim

WORKDIR /app

# Installa le librerie necessarie per il DSS
RUN pip install fastapi uvicorn networkx pymongo pydantic

# Copia i file del motore Python
COPY . .

# Espone la porta di FastAPI
EXPOSE 5000

# Avvia il server FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]