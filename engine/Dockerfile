FROM python:3.9-slim

WORKDIR /app

# Installa le dipendenze
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia tutto il codice nella cartella /app del container
COPY . .

# Comando di avvio
CMD ["python", "main.py"]