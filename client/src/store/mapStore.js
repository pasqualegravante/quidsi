import { defineStore } from 'pinia';
import { useAuthStore } from './authStore';
import { useUiStore } from './uiStore';
import { EdgeService } from '../services/edgeService';      
import { RoutingService } from '../services/routingService'; 
import { useScenarioStore } from './scenarioStore';

export const useMapStore = defineStore('map', {
  state: () => ({
    activeClosureIds: [],
    connectedComponents: [], 
    dijkstraPath: [], // ORA CONTERRA' LE COORDINATE [lat, lng]
    selectedEdges: [], 
    allEdges: [],
    alfa: 0.5, 
    poiList: [], 
    routingStartPoint: null, 
    routingEndPoint: null,
    selectionMode: null, 
    mapFocusId: null
  }),
  
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
      
      ui.setCalculating(true, "Analisi topologica di connettività...");
      try {
        const res = await RoutingService.calculateConnectedComponents(auth.uid, scenario.activeScenario.id);
        this.connectedComponents = res.CCS || [];
      } finally { ui.setCalculating(false); }
    },
    async toggleStreetStatus(uid, scenId, streetName, shouldClose) {
      const edgesToToggle = this.allEdges.filter(e => e.street === streetName);
      let success = false;
      for (const edge of edgesToToggle) {
        const isClosed = this.activeClosureIds.includes(edge.id);
        if ((shouldClose && !isClosed) || (!shouldClose && isClosed)) {
          const res = await EdgeService.toggleEdge(uid, scenId, edge.id);
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
      this.dijkstraPath = []; // Si resetterà correttamente cancellando la linea verde
      this.connectedComponents = [];
      this.routingStartPoint = null;
      this.routingEndPoint = null;
    },
    async toggleEdgeStatus(uid, scenId, edgeId) {
      const res = await EdgeService.toggleEdge(uid, scenId, edgeId);
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
      ui.setCalculating(true, "Calcolo del percorso ottimale (Dijkstra)...");
      try {
        const payload = { 
          startPoint: this.routingStartPoint, 
          endPoint: this.routingEndPoint, 
          alfa: this.alfa 
        };
        
        const res = await RoutingService.calculateDijkstra(auth.uid, scenario.activeScenario.id, payload);
        
        // Salviamo la lista di array [lat, lng] restituita dal "traduttore"
        this.dijkstraPath = res.path || [];
        
      } catch (e) {
        console.error("Errore calcolo Dijkstra:", e);
      } finally { 
        ui.setCalculating(false); 
      }
    }
  }
});