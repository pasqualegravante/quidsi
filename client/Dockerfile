# Usa un'immagine Node leggera
FROM node:20-alpine

# Imposta la cartella di lavoro nel container
WORKDIR /app

# Copia i file dei pacchetti per installare le dipendenze
COPY package*.json ./

# Installa le dipendenze (usa npm install o yarn)
RUN npm install

RUN npm install proj4

RUN npm install pinia

# Copia tutto il resto del codice della tua app Vue
COPY . .

# Espone la porta di default di Vite
EXPOSE 5173

# AVVIO: Usiamo --host per permettere a Docker di esporre l'app all'esterno
# Assicurati che nel package.json il comando "dev" sia "vite" o "vite --host"
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]