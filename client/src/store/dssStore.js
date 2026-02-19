import { defineStore } from 'pinia';
import { ApiService } from '../services/api';
import { StorageService } from '../services/storage';
import { uiStore } from './uiStore';

const ERROR_MESSAGES = {
  'NOT_FOUND': 'Percorso non trovato: la destinazione potrebbe essere isolata da chiusure.',
  'VALIDATION_ERROR_SAME_NODE': 'Partenza e arrivo coincidono. Seleziona tratti diversi.',
  'SERVER_ERROR': 'Errore del motore di calcolo (Python). Verifica la connessione.',
  'BAD_REQUEST': 'Dati non validi o ID non presenti nel grafo.',
  'ABORTED': 'Calcolo annullato.',
  'NETWORK_ERROR': 'Backend non raggiungibile. Il server Node.js/Python è acceso?',
  'GENERIC_ERROR': 'Si è verificato un errore imprevisto durante il calcolo.'
};

export const useDssStore = defineStore('dss', {
  state: () => ({
    roadList: [], 
    activeClosureIds: [], 
    activeRoutePath: [], 
    routing: { startPoint: null, endPoint: null, activeMode: null },
    routeStats: { distance: 0, duration: 0 },
    vehicleProfile: 'light', 
    mapCursor: 'grab',
    mapFocusId: null,
    currentAbortController: null,
    isSidebarOpen: false,
    selectedEdge: null,
    sidebarTimeout: null,
    printMode: false // <-- NUOVO: Stato Modalità Stampa
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
              baseId,
              streetName,
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
          result.push({ id: data.baseId, name: data.streetName, originalName: data.streetName, isEntireStreet: true });
        } else {
          data.closedSegments.forEach(segId => {
            result.push({ id: segId, name: `${data.streetName} (Tratto)`, originalName: data.streetName, isEntireStreet: false });
          });
        }
      }
      return result;
    },

    // <-- NUOVO: Generatore Turn-by-Turn
    textualItinerary(state) {
      if (!state.activeRoutePath || state.activeRoutePath.length === 0) return [];
      const steps = [];
      let currentStreet = null;

      state.activeRoutePath.forEach(id => {
        const road = state.roadList.find(r => String(r.id) === String(id));
        if (road && road.street && road.street !== 'Senza nome') {
          if (road.street !== currentStreet) {
            currentStreet = road.street;
            steps.push(currentStreet);
          }
        }
      });

      return steps.map((street, index) => {
        if (index === 0) return `Procedi su ${street}`;
        return `Svolta su ${street}`;
      });
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
        uiStore.showToast(`Seleziona punto di ${mode === 'start' ? 'partenza' : 'arrivo'}`, 'info');
      } else {
        this.mapCursor = 'grab';
      }
    },

    toggleClosure(edge, entireStreet = false) {
      if (!edge || !edge.id) return;
      const targetId = String(edge.id);
      let idsToProcess = [targetId];

      if (entireStreet && edge.street) {
        idsToProcess = this.roadList.filter(r => r.street === edge.street).map(r => String(r.id));
      }

      const isCurrentlyClosed = idsToProcess.some(id => this.activeClosureIds.includes(id));

      if (isCurrentlyClosed) {
        this.activeClosureIds = this.activeClosureIds.filter(id => !idsToProcess.includes(id));
      } else {
        this.activeClosureIds = Array.from(new Set([...this.activeClosureIds, ...idsToProcess]));
      }

      StorageService.saveClosures(this.activeClosureIds);
      this.triggerAutoRecalc();
    },

    // <-- NUOVO: Inversione Rapida
    swapRoutePoints() {
      if (!this.routing.startPoint || !this.routing.endPoint) return;
      const temp = this.routing.startPoint;
      this.routing.startPoint = this.routing.endPoint;
      this.routing.endPoint = temp;
      this.triggerAutoRecalc();
    },

    // <-- NUOVO: Sdoppiamento Reset (Percorso vs Cantieri)
    clearRoute() {
      if (this.currentAbortController) this.currentAbortController.abort();
      this.routing = { startPoint: null, endPoint: null, activeMode: null };
      this.activeRoutePath = [];
      this.routeStats = { distance: 0, duration: 0 };
      this.mapCursor = 'grab';
      this.closeSidebar();
      uiStore.showToast('Percorso azzerato', 'info');
    },

    clearClosures() {
      this.activeClosureIds = [];
      StorageService.clearClosures();
      this.triggerAutoRecalc();
      this.closeSidebar();
      uiStore.showToast('Tutte le chiusure rimosse', 'info');
    },

    triggerAutoRecalc() {
      if (!this.routing.startPoint || !this.routing.endPoint) return;
      setTimeout(() => this.executeDijkstra(), 600);
    },

    async executeDijkstra() {
      if (!this.routing.startPoint || !this.routing.endPoint) return;
      if (this.routing.startPoint.id === this.routing.endPoint.id) {
        uiStore.showToast(ERROR_MESSAGES['VALIDATION_ERROR_SAME_NODE'], 'warning');
        return;
      }

      if (this.currentAbortController) this.currentAbortController.abort();
      this.currentAbortController = new AbortController();
      uiStore.setCalculating(true);
      
      const payload = {
        start_id: this.routing.startPoint.id, 
        end_id: this.routing.endPoint.id,
        closed_edges: this.activeClosureIds,
        profile: this.vehicleProfile,
        weights: StorageService.getWeights() 
      };

      try {
        const data = await ApiService.calculateRoute(payload, this.currentAbortController.signal);
        
        if (data?.success && data.path?.length) {
          this.activeRoutePath = data.path; 
          this.routeStats.distance = data.total_km || 0;
          this.routeStats.duration = data.total_min || 0;
          uiStore.showToast('Percorso ottimale calcolato', 'success');
        } else {
          throw new Error('NOT_FOUND');
        }

      } catch (error) {
        if (error.name === 'AbortError') return;

        if (error instanceof TypeError || error.message === 'NETWORK_ERROR') {
          this.generateMockRoute();
        } else {
          this.activeRoutePath = [];
          uiStore.showToast(ERROR_MESSAGES[error.message] || ERROR_MESSAGES['GENERIC_ERROR'], 'error');
        }
      } finally {
        uiStore.setCalculating(false);
      }
    },

    generateMockRoute() {
      console.warn(`[MOCK MODE] Profilo: ${this.vehicleProfile}`);
      const startIdx = this.roadList.findIndex(r => r.id === this.routing.startPoint.id);
      const endIdx = this.roadList.findIndex(r => r.id === this.routing.endPoint.id);
      
      if (startIdx === -1 || endIdx === -1) return;

      const minIdx = Math.min(startIdx, endIdx);
      const maxIdx = Math.max(startIdx, endIdx);
      
      let mockPath = this.roadList
        .slice(minIdx, Math.min(minIdx + 25, maxIdx + 1))
        .map(r => String(r.id))
        .filter(id => !this.activeClosureIds.includes(id));

      if (!mockPath.includes(String(this.routing.endPoint.id))) {
        mockPath.push(String(this.routing.endPoint.id));
      }

      this.activeRoutePath = mockPath;

      const baseDist = mockPath.length * 0.15;
      const multipliers = { light: 1.0, heavy: 1.6, emergency: 0.8 };
      const currentMult = multipliers[this.vehicleProfile] || 1.0;

      this.routeStats.distance = (baseDist * currentMult).toFixed(1);
      this.routeStats.duration = Math.max(1, Math.round(this.routeStats.distance * (this.vehicleProfile === 'heavy' ? 4 : 2.5)));

      uiStore.showToast(`Simulazione ${this.vehicleProfile.toUpperCase()} (Backend offline)`, 'info');
    }
  }
});