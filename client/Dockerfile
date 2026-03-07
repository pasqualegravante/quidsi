# Usa un'immagine Node leggera
FROM node:20-alpine

# Imposta la cartella di lavoro
WORKDIR /app

# Copia i file delle dipendenze
COPY package*.json ./

# Installa le dipendenze
RUN npm install

# Copia tutto il resto del codice
COPY . .

# Esponi la porta di Vite
EXPOSE 5173