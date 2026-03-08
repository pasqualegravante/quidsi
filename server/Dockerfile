# Utilizziamo Node 20 per il supporto nativo alle API Web (Fetch/File)
FROM node:20-alpine

WORKDIR /app

# Installiamo le dipendenze basandoci sul package.json aggiornato
COPY package*.json ./
RUN npm install

# Copia del codice sorgente (inclusi index.js e routes/)
COPY . .

# Il server Node ascolta sulla porta 4000
EXPOSE 4000

# Avvio tramite node direttamente per stabilità in produzione
CMD ["node", "index.js"]