FROM python:3.10-slim

WORKDIR /app

# Installazione dipendenze di sistema per librerie matematiche
RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*

# Installazione dei pacchetti Python definiti in requirements.txt
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia dello script engine, translator e main
COPY . .

# Il motore Python ascolta sulla porta 8000
EXPOSE 8000

# Avvio del server FastAPI tramite lo script main.py
CMD ["python", "main.py"]