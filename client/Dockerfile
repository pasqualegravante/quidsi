# Usa un'immagine Node leggera basata su Alpine Linux
FROM node:lts-alpine

# Imposta la cartella di lavoro nel container
WORKDIR /app

# 1. Copia SOLO i file di dipendenze
# Questo permette a Docker di usare la cache se package.json non cambia,
# velocizzando enormemente le build successive.
COPY package*.json ./

# 2. Installa le dipendenze
RUN npm install

# 3. Copia il resto del codice sorgente
COPY . .

# Documenta che il container ascolterà su questa porta
EXPOSE 5173

# Comando di default (sovrascritto dal docker-compose, ma utile come fallback)
CMD ["npm", "run", "dev", "--", "--host"]