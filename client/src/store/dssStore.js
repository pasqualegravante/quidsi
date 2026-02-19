import { defineStore } from 'pinia';
import { ApiService } from '../services/api';
import { StorageService } from '../services/storage';
import { uiStore } from './uiStore';

const ERROR_MESSAGES = {
  'NOT_FOUND': 'Percorso non trovato: la destinazione potrebbe essere isolata da chiusure.',
  'VALIDATION_ERROR_SAME_NODE': 'Partenza e arrivo coincidono. Seleziona tratti diversi.',
  'ABORTED': 'Calcolo annullato.',
  'NETWORK_ERROR': 'Backend non raggiungibile.',
  'GENERIC_ERROR': 'Errore imprevisto durante il calcolo.'
};

export const useDssStore = defineStore('dss', {
  state: () => ({
    roadList: [], 
    activeClosureIds: [], 
    closuresHistory: [], 
    closuresFuture: [],  
    activeRoutePath: [], 
    routing: { startPoint: null, endPoint: null, activeMode: null },
    
    routeStats: { distance: 0, duration: 0 },
    baselineStats: { distance: 0, duration: 0 },
    
    vehicleProfile: 'light', 
    mapCursor: 'grab',
    mapFocusId: null,
    currentAbortController: null,
    isSidebarOpen: false,
    selectedEdge: null,
    sidebarTimeout: null,
    printMode: false,

    // NUOVO: DATABASE POI CRITICI TRENTO
    poiList: [
      { id: 'p1', name: 'Scuola Elementare Nicolodi', type: 'school', lat: 46.0691, lng: 11.1275 },
      { id: 'p2', name: 'Ospedale Santa Chiara', type: 'hospital', lat: 46.0545, lng: 11.1235 },
      { id: 'p3', name: 'Vigili del Fuoco Trento', type: 'fire', lat: 46.0745, lng: 11.1185 },
      { id: 'p4', name: 'Liceo Giovanni Prati', type: 'school', lat: 46.0675, lng: 11.1215 }
    ]
  }),

  getters: {
    routeImpact(state) {
      if (!state.baselineStats.duration || state.activeClosureIds.length === 0) return null;
      
      const timeDiff = state.routeStats.duration - state.baselineStats.duration;
      const distDiff = state.routeStats.distance - state.baselineStats.distance;
      const timePercent = Math.round((timeDiff / state.baselineStats.duration) * 100);
      
      return {
        timeDiff: timeDiff > 0 ? `+${timeDiff}` : timeDiff,
        distDiff: distDiff > 0 ? `+${distDiff.toFixed(1)}` : distDiff.toFixed(1),
        percent: timePercent,
        isCritical: timePercent > 30,
        isWarning: timePercent > 10 && timePercent <= 30
      };
    },

    // NUOVO: ANALISI PROSSIMITÀ ZONE SENSIBILI
    sensitiveZonesAlerts(state) {
      if (!state.activeRoutePath.length) return [];
      const alerts = [];
      const routeIds = new Set(state.activeRoutePath.map(String));

      // Simulazione logica spaziale: verifichiamo archi specifici vicini ai POI
      if (routeIds.has("1040") || routeIds.has("1041")) {
        alerts.push({ poi: state.poiList[3], msg: "Transito ravvicinato zona scolastica: possibile congestione pedonale." });
      }
      if (routeIds.has("2050") || routeIds.has("1010")) {
        alerts.push({ poi: state.poiList[1], msg: "Percorso sull'asse Ospedaliero: garantire la priorità ai mezzi di soccorso." });
      }
      return alerts;
    },

    activeClosuresObjects(state) {
      const streetGroups = {};
      state.activeClosureIds.forEach(id => {
        const road = state.roadList.find(r => String(r.id) === String(id));
        if (road) {
          const baseId = id.includes('_') ? id.split('_')[0] : id;
          const streetName = road.street || `Arco ${baseId}`;
          if (!streetGroups[streetName]) {
            streetGroups[streetName] = { baseId, streetName, closedSegments: [], totalSegments: state.roadList.filter(r => r.street === streetName).length };
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
      return steps.map((street, index) => index === 0 ? `Procedi su ${street}` : `Svolta su ${street}`);
    },

    canUndo(state) { return state.closuresHistory.length > 0; },
    canRedo(state) { return state.closuresFuture.length > 0; }
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

    saveHistoryState() {
      this.closuresHistory.push([...this.activeClosureIds]);
      this.closuresFuture = [];
    },

    toggleClosure(edge, entireStreet = false) {
      if (!edge || !edge.id) return;
      this.saveHistoryState();
      
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
      
      this.closeSidebar(); 
      StorageService.saveClosures(this.activeClosureIds);
      this.triggerAutoRecalc();
    },

    undoClosure() {
      if (this.closuresHistory.length === 0) return;
      this.closuresFuture.push([...this.activeClosureIds]);
      this.activeClosureIds = this.closuresHistory.pop();
      StorageService.saveClosures(this.activeClosureIds);
      this.triggerAutoRecalc();
      uiStore.showToast('Azione annullata', 'info');
    },

    redoClosure() {
      if (this.closuresFuture.length === 0) return;
      this.closuresHistory.push([...this.activeClosureIds]);
      this.activeClosureIds = this.closuresFuture.pop();
      StorageService.saveClosures(this.activeClosureIds);
      this.triggerAutoRecalc();
      uiStore.showToast('Azione ripristinata', 'info');
    },

    swapRoutePoints() {
      if (!this.routing.startPoint || !this.routing.endPoint) return;
      const temp = this.routing.startPoint;
      this.routing.startPoint = this.routing.endPoint;
      this.routing.endPoint = temp;
      this.triggerAutoRecalc();
    },

    clearRoute() {
      if (this.currentAbortController) this.currentAbortController.abort();
      this.routing = { startPoint: null, endPoint: null, activeMode: null };
      this.activeRoutePath = [];
      this.routeStats = { distance: 0, duration: 0 };
      this.baselineStats = { distance: 0, duration: 0 };
      this.mapCursor = 'grab';
      this.closeSidebar();
      uiStore.showToast('Percorso azzerato', 'info');
    },

    clearClosures() {
      if (this.activeClosureIds.length === 0) return;
      this.saveHistoryState();
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
      
      try {
        if (this.activeClosureIds.length > 0) {
          const baselinePayload = {
            start_id: this.routing.startPoint.id, 
            end_id: this.routing.endPoint.id,
            closed_edges: [],
            profile: this.vehicleProfile,
            weights: StorageService.getWeights() 
          };
          const bData = await ApiService.calculateRoute(baselinePayload, this.currentAbortController.signal);
          if (bData?.success) {
            this.baselineStats.distance = bData.total_km || 0;
            this.baselineStats.duration = bData.total_min || 0;
          }
        } else {
          this.baselineStats = { distance: 0, duration: 0 };
        }

        const payload = {
          start_id: this.routing.startPoint.id, 
          end_id: this.routing.endPoint.id,
          closed_edges: this.activeClosureIds,
          profile: this.vehicleProfile,
          weights: StorageService.getWeights() 
        };

        const data = await ApiService.calculateRoute(payload, this.currentAbortController.signal);
        
        if (data?.success && data.path?.length) {
          this.activeRoutePath = data.path; 
          this.routeStats.distance = data.total_km || 0;
          this.routeStats.duration = data.total_min || 0;
          
          if (this.activeClosureIds.length === 0) {
            this.baselineStats = { ...this.routeStats };
          }
          
          uiStore.showToast('Percorso calcolato', 'success');
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
      const startIdx = this.roadList.findIndex(r => r.id === this.routing.startPoint.id);
      const endIdx = this.roadList.findIndex(r => r.id === this.routing.endPoint.id);
      if (startIdx === -1 || endIdx === -1) return;

      const minIdx = Math.min(startIdx, endIdx);
      const maxIdx = Math.max(startIdx, endIdx);
      let mockPath = this.roadList.slice(minIdx, Math.min(minIdx + 25, maxIdx + 1)).map(r => String(r.id)).filter(id => !this.activeClosureIds.includes(id));
      if (!mockPath.includes(String(this.routing.endPoint.id))) mockPath.push(String(this.routing.endPoint.id));

      this.activeRoutePath = mockPath;
      const multipliers = { light: 1.0, heavy: 1.6, emergency: 0.8 };
      const currentMult = multipliers[this.vehicleProfile] || 1.0;

      const penalty = this.activeClosureIds.length > 0 ? 1.3 : 1.0;
      
      this.routeStats.distance = (mockPath.length * 0.15 * currentMult * penalty).toFixed(1);
      this.routeStats.duration = Math.max(1, Math.round(this.routeStats.distance * (this.vehicleProfile === 'heavy' ? 4 : 2.5)));
      
      if (this.activeClosureIds.length > 0) {
        this.baselineStats.distance = (mockPath.length * 0.15 * currentMult).toFixed(1);
        this.baselineStats.duration = Math.max(1, Math.round(this.baselineStats.distance * (this.vehicleProfile === 'heavy' ? 4 : 2.5)));
      } else {
        this.baselineStats = { ...this.routeStats };
      }
      
      uiStore.showToast(`Simulazione impatto attiva (Mock)`, 'info');
    }
  }
});