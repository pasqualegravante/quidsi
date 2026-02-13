# Usa un'immagine Node leggera per il backend
FROM node:20-alpine

# Installa nodemon globalmente per l'hot-reload (opzionale ma consigliato in dev)
RUN npm install -g nodemon

# Imposta la cartella di lavoro
WORKDIR /app

# Copia i file dei pacchetti
COPY package*.json ./

# Installa le dipendenze del server
RUN npm install

# Copia il codice del server
COPY . .

# Espone la porta del tuo backend (es. 4000)
EXPOSE 4000

# AVVIO: Usiamo nodemon per riavviare il server a ogni modifica dei file
# Se il tuo file principale si chiama diversamente da index.js, cambialo qui
CMD ["nodemon", "index.js"]