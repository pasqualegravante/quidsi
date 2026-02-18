import { defineStore } from 'pinia';
import { ApiService } from '../services/api';
import { StorageService } from '../services/storage';
import { uiStore } from './uiStore';

export const useDssStore = defineStore('dss', {
  state: () => ({
    roadList: [],
    activeClosureIds: [],
    activeRoutePath: [],
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
      return state.activeClosureIds.map(id => {
        const road = state.roadList.find(r => String(r.id) === String(id));
        return { id, name: road ? road.street : `Arco ${id}` };
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
      this.sidebarTimeout = setTimeout(() => { 
        this.selectedEdge = null; 
      }, 300);
    },

    toggleRoutingMode(mode) {
      this.routing.activeMode = this.routing.activeMode === mode ? null : mode;
      if (this.routing.activeMode) {
        this.closeSidebar();
        this.mapCursor = 'crosshair';
        uiStore.showToast('Seleziona un punto sulla mappa', 'warning');
      } else {
        this.mapCursor = 'grab';
      }
    },

    // Segmentazione pulita basata sul CODICE
    toggleClosure(edge, entireStreet = false) {
      if (!edge || !edge.id) return;
      
      const targetId = String(edge.id);
      const isCurrentlyClosed = this.activeClosureIds.includes(targetId);

      let idsToProcess = [targetId];

      if (entireStreet && edge.street) {
        idsToProcess = this.roadList
          .filter(r => r.street === edge.street)
          .map(r => String(r.id));
      }

      if (isCurrentlyClosed) {
        // Riapri
        this.activeClosureIds = this.activeClosureIds.filter(id => !idsToProcess.includes(id));
      } else {
        // Chiudi
        const newClosures = new Set([...this.activeClosureIds, ...idsToProcess]);
        this.activeClosureIds = Array.from(newClosures);
      }

      StorageService.saveClosures(this.activeClosureIds);
      this.triggerAutoRecalc();

      // Sincronizza popup laterale
      if (this.selectedEdge && String(this.selectedEdge.id) === targetId) {
        this.selectedEdge.isClosed = this.activeClosureIds.includes(targetId);
      }
    },

    // Reset totale 
    softReset() {
      this.closeSidebar(); 
      if (this.currentAbortController) {
        this.currentAbortController.abort();
        this.currentAbortController = null;
      }

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
      setTimeout(() => this.executeDijkstra(), 600);
    },

    async executeDijkstra() {
      if (!this.routing.startPoint || !this.routing.endPoint) return;
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
          this.activeRoutePath = data.path; uiStore.showToast('Percorso ottimale ricalcolato', 'success');
        } else {
          this.activeRoutePath = []; uiStore.showToast('Nessun percorso disponibile', 'warning');
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          this.activeRoutePath = []; uiStore.showToast('Errore di calcolo', 'error');
        }
      } finally {
        uiStore.setCalculating(false); this.currentAbortController = null;
      }
    }
  }
});