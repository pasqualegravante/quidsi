import { defineStore } from 'pinia';
import { ApiService } from '../services/api';
import { StorageService } from '../services/storage';
import { uiStore } from './uiStore'; // Il tuo store per i toast

export const useDssStore = defineStore('dss', {
  state: () => ({
    roadList: [],
    activeClosureIds: [],
    activeRoutePath: [],
    routing: { startPoint: null, endPoint: null, activeMode: null },
    mapCursor: 'grab',
    mapFocusId: null,
    currentAbortController: null,
  }),

  getters: {
    // Sostituisce la "computed" che avevi in App.vue
    activeClosuresObjects(state) {
      return state.activeClosureIds.map(id => {
        const road = state.roadList.find(r => String(r.id) === String(id));
        return { id, name: road ? road.street : `Arco ${id}` };
      });
    }
  },

  actions: {
    setRoadList(list) {
      this.roadList = list;
    },

    setFocusEdge(id) {
      this.mapFocusId = String(id);
    },

    toggleRoutingMode(mode) {
      this.routing.activeMode = this.routing.activeMode === mode ? null : mode;
      if (this.routing.activeMode) {
        this.mapCursor = 'crosshair';
        uiStore.showToast('Seleziona un punto sulla mappa', 'warning');
      } else {
        this.mapCursor = 'grab';
      }
    },

    toggleClosure(idStr) {
      if (this.activeClosureIds.includes(idStr)) {
        this.activeClosureIds = this.activeClosureIds.filter(id => id !== idStr);
      } else {
        this.activeClosureIds.push(idStr);
      }
      StorageService.saveClosures(this.activeClosureIds);
      this.triggerAutoRecalc();
    },

    triggerAutoRecalc() {
      if (this.activeRoutePath.length === 0) return;
      setTimeout(() => this.executeDijkstra(), 600); // Semplificato per l'esempio
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
        if (data && data.success && data.path.length) {
          this.activeRoutePath = data.path; 
          uiStore.showToast('Percorso ricalcolato', 'success');
        } else {
          this.activeRoutePath = [];
          uiStore.showToast('Nessun percorso disponibile', 'warning');
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          this.activeRoutePath = [];
          uiStore.showToast('Errore di calcolo', 'error');
        }
      } finally {
        uiStore.setCalculating(false);
      }
    },

    softReset() {
      if (this.currentAbortController) this.currentAbortController.abort();
      this.routing = { startPoint: null, endPoint: null, activeMode: null };
      this.activeRoutePath = [];
      this.activeClosureIds = [];
      this.mapCursor = 'grab';
      this.mapFocusId = null;
      StorageService.clearClosures(); 
    }
  }
});