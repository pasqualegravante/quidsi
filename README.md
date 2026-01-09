# QuidSI - Decision Support System (v3.0)

Sistema di Supporto Decisionale (DSS) basato su GIS per l'analisi del traffico, il calcolo dei percorsi ottimali e l'analisi di copertura (isocrone) in tempo reale.

## Funzionalità Principali

* **Routing Intelligente:** Calcolo percorso A -> B con confronto tra scenario ideale e reale (strade chiuse).
* **Analisi Copertura (Isocrone):** Visualizzazione delle aree raggiungibili in X minuti da un punto specifico.
* **Gestione Blocchi Stradali:** Possibilità di chiudere/aprire strade in tempo reale con ricalcolo immediato.
* **Scenari:** Salvataggio e caricamento di configurazioni di chiusura strade su Database.
* **Ricerca Indirizzi:** Geocoding integrato tramite OpenStreetMap.

##  Architettura

Il sistema è basato su **Microservizi** orchestrati tramite Docker:

1.  **Client (Vue.js + Leaflet):** Interfaccia utente interattiva.
2.  **Server (Node.js + Express):** API Gateway e gestione persistenza dati.
3.  **Engine (Python + NetworkX + Shapely):** Motore di calcolo grafo, pathfinding e geometria spaziale.
4.  **Database (MongoDB):** Storage persistente per gli scenari.

## Installazione e Avvio

Prerequisiti: [Docker Desktop](https://www.docker.com/products/docker-desktop/) installato.

1.  Clona il repository.
2.  Assicurati di avere il file `grafo_optimized.geojson` nella cartella `/engine`.
3.  Esegui il comando di avvio:

```bash
docker-compose up --build