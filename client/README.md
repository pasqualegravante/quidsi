# DSS - Decision Support System (Traffic Management)

Questo repository contiene il frontend dell'applicazione DSS (Decision Support System), sviluppato per la gestione, simulazione e analisi di scenari di traffico urbano. L'applicazione è basata su **Vue 3** e utilizza **Pinia** per lo state management e **Leaflet** per il rendering cartografico.

L'architettura del progetto è stata strutturata seguendo i principi dell'**Atomic Design** per l'interfaccia utente e garantendo una netta separazione delle responsabilità (Separation of Concerns) tra il livello di presentazione, la logica di stato e il livello di comunicazione di rete.

---

## Struttura del Progetto

Il codice sorgente è organizzato all'interno della directory `src/`, suddivisa in moduli logici.

### 1. Livello di Rete (Services)
La directory `src/services/` isola la logica di comunicazione con le API di backend. Il sistema integra un meccanismo di mock per consentire lo sviluppo e i test in assenza del server.

* **`apiConfig.js`**: File di configurazione contenente gli endpoint. La variabile `USE_MOCKS` permette di deviare le chiamate di rete verso risposte simulate locali.
* **`scenarioService.js`**: Espone i metodi CRUD per la gestione degli scenari. In modalità mock, gestisce un in-memory database per garantire la persistenza locale della sessione.
* **`routingService.js`**: Gestisce le chiamate computazionali sul grafo, includendo l'algoritmo di Dijkstra per il calcolo dei percorsi ottimali e l'algoritmo per l'individuazione delle componenti connesse (aree isolate).
* **`edgeService.js`**: Gestisce le mutazioni di stato dei singoli segmenti stradali (apertura/chiusura).
* **`searchService.js`**: Implementa un motore di indicizzazione locale per raggruppare i frammenti del file GeoJSON, fornendo una funzionalità di ricerca univoca e ottimizzata.
* **`storage.js`**: Fornisce un'astrazione per le interazioni con il `localStorage` del browser, utilizzato per parametri di configurazione persistenti.

### 2. Gestione dello Stato (Stores)
La directory `src/store/` contiene i moduli Pinia che detengono la logica di business e lo stato dell'applicazione. Nessun componente UI effettua chiamate di rete dirette.

* **`dssStore.js`**: Implementa il pattern *Facade*. Funge da orchestratore centrale esponendo in modo unificato i metodi e le proprietà reattive degli altri store, semplificando le dipendenze nei componenti.
* **`mapStore.js`**: Detiene lo stato geografico: array degli archi totali, selezioni attive, identificatori degli archi chiusi e output dei calcoli di routing.
* **`scenarioStore.js`**: Gestisce il ciclo di vita degli scenari, tracciando lo scenario correntemente attivo, lo stato di modifica (`isModified`) e la coda delle azioni pendenti che richiedono validazione.
* **`uiStore.js`**: Contiene lo stato dell'interfaccia utente (caricamenti, messaggi di sistema) e funge da *State Container* globale per la visualizzazione dinamica di pannelli laterali e modali.
* **`authStore.js`**: Modulo dedicato alla gestione dell'autenticazione utente e delle autorizzazioni di sessione.

### 3. Interfaccia Utente (Components)
La directory `src/components/` è organizzata modularmente per favorire la riusabilità del codice.

#### Componenti Strutturali
* **`App.vue`**: Entry point dell'interfaccia. Agisce come layout container e gestisce il rendering dinamico dei modali globali tramite l'ascolto dello store UI.
* **`MapGraph.vue` & `MapLegend.vue`**: Componenti di integrazione con la libreria Leaflet. Gestiscono il rendering del GeoJSON e l'emissione di eventi spaziali.

#### Sidebar Sinistra (`src/components/tabs/`)
Contiene i moduli operativi per l'interazione con l'utente:
* **`TabArchivio.vue`**: Interfaccia di gestione degli scenari. Scomposta in `ScenarioSearch.vue` (input) e `ScenarioItem.vue` (riga di dettaglio con editing contestuale).
* **`TabFunzioni.vue`**: Selettore per l'avvio delle analisi spaziali. Devolve la renderizzazione dei parametri ai moduli `DijkstraForm.vue` e `ConnectivityForm.vue`.
* **`TabInterventi.vue`**: Pannello di riepilogo testuale per la visualizzazione delle modifiche attive sulla rete stradale.

#### Sidebar Destra (`src/components/panels/`)
Pannelli informativi contestuali alle selezioni effettuate sulla mappa:
* **`SingleEdgePanel.vue` & `MultiEdgePanel.vue`**: Container per la visualizzazione dei dati in base alla cardinalità della selezione. Utilizzano componenti atomici per la renderizzazione:
  * `EdgeInfoList.vue`: Componente presentazionale per i metadati stradali.
  * `EdgeActionsSingle.vue` / `EdgeActionsMulti.vue`: Raggruppano i controlli operativi, delegando l'esecuzione dell'azione agli store superiori.

#### Modali (`src/components/modals/`)
Componenti in sovraimpressione gestiti tramite approccio *Modal Portal* centralizzato.
* **`ConfirmDeleteModal.vue`**: Richiesta di conferma per operazioni distruttive (es. eliminazione scenario).
* **`SavePromptModal.vue`**: Blocco preventivo in presenza di modifiche non salvate prima del cambio di contesto.

---

## Flusso Operativo dei Dati

Di seguito un esempio del flusso unidirezionale dei dati, illustrato tramite l'azione di "chiusura di un tratto stradale":

1. L'utente interagisce con un segmento sul componente `MapGraph.vue`.
2. L'evento viene catturato da `App.vue`, che delega l'elaborazione chiamando il metodo `processMapClick` del modulo `dssStore.js`.
3. Il `dssStore` registra la selezione in `mapStore` e notifica allo `uiStore` di aggiornare lo stato di visibilità del pannello di destra (`SidebarRight.vue`).
4. Il componente `SingleEdgePanel.vue` o `MultiEdgePanel.vue` renderizza i metadati. L'utente esegue l'azione (click sul pulsante di chiusura).
5. Il componente figlio emette l'evento verso lo store, che invoca `toggleEdgeStatus()`.
6. La richiesta viene passata a `EdgeService.toggleEdge()`, che elabora la chiamata asincrona all'API (o al mock).
7. Alla risoluzione della promise, il `mapStore` aggiorna l'array reattivo `activeClosureIds`.
8. Contemporaneamente, lo `scenarioStore` aggiorna il flag `isModified` a `true`.
9. I componenti in ascolto (incluso `MapGraph.vue`) intercettano la mutazione di stato e re-renderizzano le sezioni interessate dell'interfaccia in tempo reale.

---

## Setup del Progetto

1. Installazione delle dipendenze:
   ```bash
   npm install
2. Assicurarsi che il layer geografico di base (`grafo_web.geojson`) sia regolarmente posizionato all'interno della directory `public/`.

3. Per l'esecuzione in ambiente di sviluppo senza backend, verificare che in `src/apiConfig.js` sia impostata l'istruzione:
    export const USE_MOCKS = true;  
4. Avvio del server di sviluppo:
    npm run dev