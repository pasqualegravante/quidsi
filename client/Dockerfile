# /client/Dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Espone la porta e avvia in modalità host per essere visibile fuori
CMD ["npm", "run", "dev", "--", "--host"]