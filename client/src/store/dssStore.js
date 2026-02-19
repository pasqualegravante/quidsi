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
    roadList: [], 
    activeClosureIds: [], 
    activeRoutePath: [], 
    routing: { startPoint: null, endPoint: null, activeMode: null },
    // Aggiunte statistiche operative per il percorso
    routeStats: { distance: 0, duration: 0 },
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
          result.push({ 
            id: data.baseId, 
            name: data.streetName,
            originalName: data.streetName, 
            isEntireStreet: true           
          });
        } else {
          data.closedSegments.forEach(segId => {
            result.push({ 
              id: segId, 
              name: `${data.streetName} (Tratto)`,
              originalName: data.streetName, 
              isEntireStreet: false          
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

    toggleClosure(edge, entireStreet = false) {
      if (!edge || !edge.id) return;
      
      const targetId = String(edge.id);
      let idsToProcess = [targetId];

      if (entireStreet && edge.street) {
        idsToProcess = this.roadList
          .filter(r => r.street === edge.street)
          .map(r => String(r.id));
      }

      const isCurrentlyClosed = idsToProcess.some(id => this.activeClosureIds.includes(id));

      if (isCurrentlyClosed) {
        this.activeClosureIds = this.activeClosureIds.filter(id => !idsToProcess.includes(id));
      } else {
        const newClosures = new Set([...this.activeClosureIds, ...idsToProcess]);
        this.activeClosureIds = Array.from(newClosures);
      }

      StorageService.saveClosures(this.activeClosureIds);
      this.triggerAutoRecalc();

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
      this.routeStats = { distance: 0, duration: 0 }; // Reset statistiche
      this.mapCursor = 'grab';
      this.mapFocusId = null;
      StorageService.clearClosures(); 
      uiStore.showToast('Sistema ripristinato', 'info');
    },

    triggerAutoRecalc() {
      if (this.activeRoutePath.length === 0) return;
      setTimeout(() => this.executeDijkstra(), 600);
    },

    // 🚀 MOTORE DI ROUTING (API + Mock)
    async executeDijkstra() {
      if (!this.routing.startPoint || !this.routing.endPoint) return;
      
      if (this.routing.startPoint.id === this.routing.endPoint.id) {
        uiStore.showToast(ERROR_MESSAGES['VALIDATION_ERROR_SAME_NODE'], 'warning');
        this.activeRoutePath = [];
        return;
      }

      if (this.currentAbortController) this.currentAbortController.abort();
      this.currentAbortController = new AbortController();
      
      uiStore.setCalculating(true);
      
      const payload = {
        start_id: this.routing.startPoint.id, 
        end_id: this.routing.endPoint.id,
        closed_edges: this.activeClosureIds,
        weights: StorageService.getWeights() 
      };

      try {
        const data = await ApiService.calculateRoute(payload, this.currentAbortController.signal);
        
        if (data && data.success && data.path && data.path.length) {
          this.activeRoutePath = data.path; 
          
          // Estrai statistiche se il backend le invia, altrimenti fallback zero
          this.routeStats.distance = data.total_km || 0;
          this.routeStats.duration = data.total_min || 0;

          uiStore.showToast('Percorso ottimale calcolato', 'success');
        } else {
          this.activeRoutePath = []; 
          uiStore.showToast(ERROR_MESSAGES['NOT_FOUND'], 'warning');
        }

      } catch (error) {
        const errorKey = error.message;

        if (error.name === 'AbortError' || errorKey === 'ABORTED') {
          uiStore.showToast(ERROR_MESSAGES['ABORTED'], 'info');
          return;
        }

        // 🛠️ MOCK MODE INTERCEPTOR: Se il server è irraggiungibile, simuliamo un percorso
        if (error instanceof TypeError || errorKey === 'NETWORK_ERROR') {
          console.warn("[MOCK MODE] Generazione percorso simulato...");
          
          // Creazione di un array finto di ID estraendo una "fetta" di strade dal GeoJSON
          const startIdx = this.roadList.findIndex(r => r.id === this.routing.startPoint.id);
          const endIdx = this.roadList.findIndex(r => r.id === this.routing.endPoint.id);
          
          let mockPath = [];
          if (startIdx !== -1 && endIdx !== -1) {
            const minIdx = Math.min(startIdx, endIdx);
            const maxIdx = Math.max(startIdx, endIdx);
            // Prende un po' di segmenti adiacenti nell'array (max 20 per non riempire la mappa)
            mockPath = this.roadList.slice(minIdx, Math.min(minIdx + 20, maxIdx + 1)).map(r => String(r.id));
            if (!mockPath.includes(String(this.routing.endPoint.id))) mockPath.push(String(this.routing.endPoint.id));
          } else {
            mockPath = [this.routing.startPoint.id, this.routing.endPoint.id];
          }

          // Rimuoviamo gli ID che sono attualmente chiusi
          mockPath = mockPath.filter(id => !this.activeClosureIds.includes(id));

          this.activeRoutePath = mockPath;
          
          // Statistiche Mock (Inventate in base a quanti segmenti compongono il percorso falso)
          this.routeStats.distance = (mockPath.length * 0.12).toFixed(1); // Finti 120m per arco
          this.routeStats.duration = Math.max(1, Math.round(this.routeStats.distance * 2.5));

          uiStore.showToast('Demo Mode: Percorso simulato (Backend offline)', 'info');
        } else {
          this.activeRoutePath = []; 
          const msg = ERROR_MESSAGES[errorKey] || ERROR_MESSAGES['GENERIC_ERROR'];
          uiStore.showToast(msg, 'error');
        }

      } finally {
        uiStore.setCalculating(false); 
        this.currentAbortController = null;
      }
    }
  }
});