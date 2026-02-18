import { defineStore } from 'pinia';
import { ApiService } from '../services/api';
import { StorageService } from '../services/storage';
import { uiStore } from './uiStore';

// Mappatura errori per tradurre i codici API in messaggi umani chiari
const ERROR_MESSAGES = {
  'NOT_FOUND': 'Percorso non trovato: la destinazione potrebbe essere isolata da chiusure.',
  'VALIDATION_ERROR_SAME_NODE': 'Partenza e arrivo coincidono. Seleziona tratti diversi.',
  'SERVER_ERROR': 'Errore del motore di calcolo (Python). Verifica la connessione o i log del server.',
  'BAD_REQUEST': 'Dati non validi o ID non presenti nel grafo del server.',
  'ABORTED': 'Calcolo annullato dall\'utente.',
  'NETWORK_ERROR': 'Backend non raggiungibile. Il server Node.js è acceso?',
  'GENERIC_ERROR': 'Si è verificato un errore imprevisto durante il calcolo.'
};

export const useDssStore = defineStore('dss', {
  state: () => ({
    roadList: [], // Popolata da MapGraph.vue all'avvio
    activeClosureIds: [], // Array di String (id_arco nativi)
    activeRoutePath: [], // Array di String (id_arco nativi restituiti da Python)
    routing: { startPoint: null, endPoint: null, activeMode: null },
    mapCursor: 'grab',
    mapFocusId: null,
    currentAbortController: null,
    isSidebarOpen: false,
    selectedEdge: null,
    sidebarTimeout: null
  }),

  getters: {
    activeClosuresObjects(state) {
      const streetGroups = {};

      state.activeClosureIds.forEach(id => {
        const road = state.roadList.find(r => String(r.id) === String(id));
        if (road) {
          const baseId = id.includes('_') ? id.split('_')[0] : id;
          const streetName = road.street || `Arco ${baseId}`;

          if (!streetGroups[streetName]) {
            streetGroups[streetName] = {
              baseId: baseId,
              streetName: streetName,
              closedSegments: [],
              totalSegments: state.roadList.filter(r => r.street === streetName).length
            };
          }
          streetGroups[streetName].closedSegments.push(id);
        }
      });

      const result = [];
      for (const data of Object.values(streetGroups)) {
        if (data.closedSegments.length === data.totalSegments) {
          // VIA INTERA
          result.push({ 
            id: data.baseId, 
            name: data.streetName,
            originalName: data.streetName, // <--- Aggiunto
            isEntireStreet: true           // <--- Aggiunto
          });
        } else {
          // SINGOLO TRATTO
          data.closedSegments.forEach(segId => {
            result.push({ 
              id: segId, 
              name: `${data.streetName} (Tratto)`,
              originalName: data.streetName, // <--- Aggiunto
              isEntireStreet: false          // <--- Aggiunto
            });
          });
        }
      }
      return result;
    }
  },

  actions: {
    setRoadList(list) { this.roadList = list; },
    setFocusEdge(id) { this.mapFocusId = String(id); },
    
    openSidebar(edge) {
      if (this.sidebarTimeout) clearTimeout(this.sidebarTimeout);
      this.selectedEdge = edge;
      this.isSidebarOpen = true;
    },

    closeSidebar() {
      this.isSidebarOpen = false;
      if (this.sidebarTimeout) clearTimeout(this.sidebarTimeout);
      // Timeout per permettere all'animazione CSS di finire prima di svuotare i dati
      this.sidebarTimeout = setTimeout(() => { this.selectedEdge = null; }, 300);
    },

    toggleRoutingMode(mode) {
      this.routing.activeMode = this.routing.activeMode === mode ? null : mode;
      if (this.routing.activeMode) {
        this.closeSidebar();
        this.mapCursor = 'crosshair';
        uiStore.showToast(`Seleziona il punto di ${mode === 'start' ? 'partenza' : 'arrivo'} sulla mappa`, 'info');
      } else {
        this.mapCursor = 'grab';
      }
    },

    // Gestione chiusure manuali (Singolo arco o intera via)
    toggleClosure(edge, entireStreet = false) {
      if (!edge || !edge.id) return;
      
      const targetId = String(edge.id);
      let idsToProcess = [targetId];

      // Se l'utente chiede di chiudere/aprire tutta la via, troviamo tutti gli id_arco associati a quel nome
      if (entireStreet && edge.street) {
        idsToProcess = this.roadList
          .filter(r => r.street === edge.street)
          .map(r => String(r.id));
      }

      // FIX APPLICATO: Controlla se ALMENO UNO degli id da processare è attualmente chiuso
      const isCurrentlyClosed = idsToProcess.some(id => this.activeClosureIds.includes(id));

      if (isCurrentlyClosed) {
        // Riapri la strada (Filtra via TUTTI gli ID trovati)
        this.activeClosureIds = this.activeClosureIds.filter(id => !idsToProcess.includes(id));
      } else {
        // Chiudi la strada (Aggiungi gli ID all'array evitando duplicati)
        const newClosures = new Set([...this.activeClosureIds, ...idsToProcess]);
        this.activeClosureIds = Array.from(newClosures);
      }

      StorageService.saveClosures(this.activeClosureIds);
      
      // Innesca il ricalcolo automatico se c'è un percorso attivo
      this.triggerAutoRecalc();

      // Aggiorna lo stato visivo della sidebar se è aperta su questo arco
      if (this.selectedEdge && idsToProcess.includes(String(this.selectedEdge.id))) {
        this.selectedEdge.isClosed = this.activeClosureIds.includes(String(this.selectedEdge.id));
      }
    },

    softReset() {
      this.closeSidebar(); 
      if (this.currentAbortController) this.currentAbortController.abort();
      this.routing = { startPoint: null, endPoint: null, activeMode: null };
      this.activeRoutePath = [];
      this.activeClosureIds = [];
      this.mapCursor = 'grab';
      this.mapFocusId = null;
      StorageService.clearClosures(); 
      uiStore.showToast('Sistema ripristinato', 'info');
    },

    triggerAutoRecalc() {
      if (this.activeRoutePath.length === 0) return;
      // Debounce di 600ms per evitare flood di chiamate API se l'utente clicca velocemente
      setTimeout(() => this.executeDijkstra(), 600);
    },

    // 🚀 MOTORE DI ROUTING (Interazione con Python)
    async executeDijkstra() {
      // 1. Controllo base
      if (!this.routing.startPoint || !this.routing.endPoint) return;
      
      // 2. Validazione Pre-volo: Partenza e Arrivo uguali
      if (this.routing.startPoint.id === this.routing.endPoint.id) {
        uiStore.showToast(ERROR_MESSAGES['VALIDATION_ERROR_SAME_NODE'], 'warning');
        this.activeRoutePath = [];
        return;
      }

      // 3. Setup e pulizia connessioni pendenti
      if (this.currentAbortController) this.currentAbortController.abort();
      this.currentAbortController = new AbortController();
      
      uiStore.setCalculating(true);
      
      // Costruzione DTO esatto richiesto dai vincoli di sistema
      const payload = {
        start_id: this.routing.startPoint.id, 
        end_id: this.routing.endPoint.id,
        closed_edges: this.activeClosureIds,
        weights: StorageService.getWeights() 
      };

      try {
        const data = await ApiService.calculateRoute(payload, this.currentAbortController.signal);
        
        // 4. Gestione Risposta Positiva
        if (data && data.success && data.path && data.path.length) {
          // Assegnazione diretta degli id_arco nativi restituiti da Python
          this.activeRoutePath = data.path; 
          uiStore.showToast('Percorso ottimale calcolato', 'success');
        } else {
          // Gestione casi limite (es. Backend restituisce path vuoto)
          this.activeRoutePath = []; 
          uiStore.showToast(ERROR_MESSAGES['NOT_FOUND'], 'warning');
        }

      } catch (error) {
        // 5. Gestione Errori e Traduzione in Toast
        this.activeRoutePath = []; 
        const errorKey = error.message;

        // Gestione abort volontario
        if (error.name === 'AbortError' || errorKey === 'ABORTED') {
          uiStore.showToast(ERROR_MESSAGES['ABORTED'], 'info');
          return;
        }

        // Gestione server spento (TypeError è tipico di fetch quando fallisce la connessione TCP)
        if (error instanceof TypeError) {
           uiStore.showToast(ERROR_MESSAGES['NETWORK_ERROR'], 'error');
           return;
        }

        // Gestione errori codificati dall'API (400, 404, 500)
        const msg = ERROR_MESSAGES[errorKey] || ERROR_MESSAGES['GENERIC_ERROR'];
        uiStore.showToast(msg, 'error');
        console.error("[DSS Store] Errore Routing:", error);

      } finally {
        uiStore.setCalculating(false); 
        this.currentAbortController = null;
      }
    }
  }
});