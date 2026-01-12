# QuidEngine: Advanced Urban Routing System

QuidEngine è una piattaforma enterprise per il calcolo di percorsi urbani ottimizzati, analisi isocrone e simulazione di scenari di traffico.
Utilizza un motore fisico custom per calcolare i tempi di percorrenza basandosi sulla tortuosità delle strade (curve) e sulla densità degli incroci, offrendo stime più realistiche rispetto ai navigatori tradizionali.

## 🚀 Features Principali

* **Fisica di Guida Realistica:** Algoritmo proprietario che penalizza strade sinuose e incroci frequenti.
* **Gestione Traffico Dinamica:** Simulazione live di 4 livelli di intensità (Low, Medium, High, Jam) con ricalcolo immediato dei percorsi.
* **Scenario Manager:** Salvataggio, caricamento e applicazione di scenari di chiusura strade (es. "Mercato del Giovedì", "Lavori Corso Roma").
* **Analisi Isocrone:** Visualizzazione delle aree raggiungibili in X minuti, influenzate dal traffico attuale.
* **Architettura Resiliente:** Backend Python progettato per non crashare anche in caso di down del Database.

## 🛠 Tech Stack

* **Backend:** Python 3.9, FastAPI, NetworkX (Graph Theory), Shapely (Geometry).
* **Frontend:** Vue.js 3, Vite, Leaflet (Mappe interattive).
* **Database:** MongoDB (Persistenza Scenari).
* **Infrastructure:** Docker & Docker Compose.

## 📦 Installazione e Avvio

Assicurati di avere Docker e Docker Compose installati.

1.  **Clona il repository:**
    ```bash
    git clone [https://github.com/tuo-user/quid-engine.git](https://github.com/tuo-user/quid-engine.git)
    cd quid-engine
    ```

2.  **Avvia i container:**
    ```bash
    docker-compose up --build
    ```

3.  **Accedi:**
    * Frontend: `http://localhost:5173`
    * API Docs: `http://localhost:4000/docs`

## 📖 Utilizzo API

L'API è auto-documentata via Swagger. Alcuni endpoint chiave:

* `POST /api/calculate-route`: Calcola percorso A -> B.
* `POST /api/set-traffic/{level}`: Imposta traffico (low, medium, high, jam).
* `POST /api/toggle-closure/{id}`: Chiude una strada specifica.
* `GET /api/scenarios`: Lista scenari salvati.

## 🔧 Struttura Progetto

```text
/engine          # Backend Python
  ├── main.py    # Core logic (Routing, Physics, API)
  └── Dockerfile
/client          # Frontend Vue
  ├── src/components/MapGraph.vue
  └── Dockerfile
docker-compose.yml