import { defineStore } from 'pinia';
import { ApiService } from '../services/api_server'; 
import { useAuthStore } from './authStore';
import { useUiStore } from './uiStore';
import { useScenarioStore } from './scenarioStore';

export const useMapStore = defineStore('map', {
  state: () => ({
    activeClosureIds: [],
    connectedComponents: [], 
    dijkstraPath: [],
    selectedEdges: [], 
    allEdges: [],
    alfa: 0.5, 
    poiList: [], 
    routingStartPoint: null, 
    routingEndPoint: null,
    selectionMode: null, 
    mapFocusId: null
  }),
  
  // CORREZIONE BUG #2: I getters ora sono al livello corretto!
  getters: {
    activeClosuresObjects: (state) => {
      return state.activeClosureIds.map(id => {
        const edge = state.allEdges.find(e => String(e.id) === String(id));
        return edge || { id, street: 'Via Sconosciuta' };
      });
    }
  },

  actions: {
    setRoutingPoint(payload) {
      if (this.selectionMode === 'start') {
        this.routingStartPoint = payload;
      } else if (this.selectionMode === 'end') {
        this.routingEndPoint = payload;
      }
      this.selectionMode = null; 
    },
    handleEdgeSelection(payload) {
      const edgeId = String(payload.id);
      const edgeData = { ...payload, id: edgeId };
      if (payload.isMulti) {
        const index = this.selectedEdges.findIndex(e => String(e.id) === edgeId);
        index === -1 ? this.selectedEdges.push(edgeData) : this.selectedEdges.splice(index, 1);
      } else {
        this.selectedEdges = (this.selectedEdges.length === 1 && String(this.selectedEdges[0].id) === edgeId) 
          ? [] : [edgeData];
      }
    },
    async calculateConnectedComponents() {
      const ui = useUiStore();
      const auth = useAuthStore();
      const scenario = useScenarioStore();
      
      ui.setCalculating(true);
      try {
        const res = await ApiService.calculateConnectedComponents(auth.uid, scenario.activeScenario.id);
        this.connectedComponents = res.CCS || [];
      } finally { ui.setCalculating(false); }
    },
    async toggleStreetStatus(uid, scenId, streetName, shouldClose) {
      const edgesToToggle = this.allEdges.filter(e => e.street === streetName);
      let success = false;
      for (const edge of edgesToToggle) {
        const isClosed = this.activeClosureIds.includes(edge.id);
        if ((shouldClose && !isClosed) || (!shouldClose && isClosed)) {
          const res = await ApiService.toggleEdge(uid, scenId, edge.id);
          if (res.toggled) {
            const idx = this.activeClosureIds.indexOf(edge.id);
            idx > -1 ? this.activeClosureIds.splice(idx, 1) : this.activeClosureIds.push(edge.id);
            success = true;
          }
        }
      }
      return success;
    },
    clearMapFocus() { this.mapFocusId = null; },
    resetSelection() {
      this.selectedEdges = [];
      this.dijkstraPath = [];
      this.connectedComponents = [];
      this.routingStartPoint = null;
      this.routingEndPoint = null;
    },
    async toggleEdgeStatus(uid, scenId, edgeId) {
      const res = await ApiService.toggleEdge(uid, scenId, edgeId);
      if (res.toggled) {
        const idx = this.activeClosureIds.indexOf(edgeId);
        idx > -1 ? this.activeClosureIds.splice(idx, 1) : this.activeClosureIds.push(edgeId);
        return true;
      }
      return false;
    },
    async calculateDijkstra() {
      const ui = useUiStore();
      const auth = useAuthStore();
      const scenario = useScenarioStore();
      if (!this.routingStartPoint || !this.routingEndPoint) return;

      ui.setCalculating(true);
      try {
        const res = await ApiService.calculateDijkstra(auth.uid, scenario.activeScenario.id, { 
          start: this.routingStartPoint.id, 
          end: this.routingEndPoint.id, 
          alfa: this.alfa 
        });
        this.dijkstraPath = res.edges;
      } finally { ui.setCalculating(false); }
    }
  }
});