# Usa un'immagine Node leggera per il backend
FROM node:20-alpine

# Imposta la cartella di lavoro
WORKDIR /app

# Copia i file dei pacchetti
COPY package*.json ./

# Installa le dipendenze del server
RUN npm install

# Copia il codice del server
COPY . .

# Espone la porta del tuo backend
EXPOSE 4000

# AVVIO: Usiamo node per la stabilità
CMD ["node", "index.js"]