# DSS - Decision Support System (Traffic Management)

Questo repository contiene il frontend dell'applicazione DSS (Decision Support System), sviluppato per la gestione, simulazione e analisi di scenari di traffico urbano. L'applicazione è basata su **Vue 3**, **Pinia** per lo state management e **Leaflet** per il rendering cartografico.

L'architettura segue i principi dell'**Atomic Design** e garantisce una netta separazione delle responsabilità (*Separation of Concerns*) tra presentazione, logica di stato e comunicazione di rete. L'approccio è quello del **Digital Twin**: il client mima esattamente lo stato del grafo sul server (MongoDB/NetworkX), mantenendo sincronizzati scenari, chiusure (archi rossi) e percorsi calcolati (archi verdi).

---

## Struttura del Progetto

Il codice sorgente è organizzato nella directory `src/` in moduli logici disaccoppiati.

### 1. Livello di Rete e Servizi (Services)
Logica di comunicazione API e astrazione delle operazioni complesse:

* **`apiConfig.js`**: Configurazione endpoint e flag `USE_MOCKS` per test senza backend.
* **`scenarioService.js`**: Gestione CRUD degli scenari con persistenza in-memory per i mock.
* **`routingService.js`**: Funge da **Adapter Universale**. Converte le coordinate geografiche (WGS84) del frontend in coordinate piane (UTM 32N) per NetworkX e viceversa. Questo permette il calcolo dei percorsi basato su punti esatti anziché su ID archi, risolvendo le discrepanze tra `grafo_web.geojson` e `grafo_pulito.graphml`.
* **`edgeService.js`**: Gestione dello stato di apertura/chiusura dei segmenti stradali.
* **`printService.js`**: Regista asincrono della stampa. Orchestra la preparazione della mappa, attende il rendering dei tile, esegue lo snapshot con `html2canvas` a scala 1.5x e ripristina lo stato della UI.
* **`searchService.js`**: Indicizzazione locale che raggruppa frammenti stradali in toponimi univoci per l'utente.

### 2. Gestione dello Stato (Store)
* **`mapStore.js`**: Core geospaziale. Gestisce `activeClosureIds`, `dijkstraPath` (come array di coordinate `[lat, lng]`), parametri di simulazione (`alfa`) e punti di routing.
* **`scenarioStore.js`**: Metadati dello scenario attivo (ID, label, descrizione, data).
* **`uiStore.js`**: Stato dell'interfaccia (caricamenti, modali, snapshot del report).
* **`dssStore.js`**: Facade Store che aggrega i moduli precedenti in un'unica interfaccia per i componenti Vue.

### 3. Logica Cartografica (Composables)
* **`useMapDijkstra.js`**: Disegna il percorso ottimale come linea vettoriale verde indipendente dal grafo base.
* **`useMapPrint.js`**: Gestisce lo zoom intelligente pre-stampa. Calcola i `bounds` matematici dei soli elementi rilevanti (rossi/verdi) e applica un padding asimmetrico per evitare che la legenda copra le strade nel report.

### 4. Componenti UI
* **`MapGraph.vue`**: Gestisce l'istanza Leaflet, il caricamento del GeoJSON e la cattura delle coordinate di click.
* **`App.vue`**: Punto di ingresso che implementa l'**auto-scenario** al login, caricando immediatamente un ambiente di lavoro per l'operatore.
* **`ReportTemplate.vue`**: Template A4 per la stampa. Utilizza una "gabbia" CSS (`object-fit: cover`) per garantire che lo snapshot della mappa sia perfettamente inquadrato senza sbavature.

---

## Flusso Operativo Dijkstra & Report

1. **Selezione**: L'utente clicca sulla mappa; il sistema cattura l'ID e le coordinate `latlng`.
2. **Calcolo**: `RoutingService` traduce le coordinate in UTM e interroga il server Python.
3. **Rendering**: Il server restituisce nodi `"x y"`; il servizio li riconverte in `[lat, lng]` e `useMapDijkstra` disegna la linea verde.
4. **Stampa**: `PrintService` nasconde i layer inutili, la legenda scompare temporaneamente via `v-show`, `html2canvas` scatta la foto e il browser apre il dialogo di stampa.

---

## Setup
1. `npm install`
2. Posizionare `grafo_web.geojson` in `public/`.
3. `npm run dev`