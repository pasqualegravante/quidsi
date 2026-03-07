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

    clearMapFocus() { this.mapFocusId = null; },

    resetSelection() {
      this.selectedEdges = [];
      this.dijkstraPath = []; 
      this.connectedComponents = [];
      this.routingStartPoint = null;
      this.routingEndPoint = null;
    },

    async calculateConnectedComponents() {
      const ui = useUiStore();
      const auth = useAuthStore();
      const scenario = useScenarioStore();
      
      ui.setCalculating(true, "Analisi topologica di connettività...");
      try {
        const res = await RoutingService.calculateConnectedComponents(auth.uid, scenario.activeScenario.id);
        if (res && res.CCS) {
          this.connectedComponents = res.CCS;
        } else {
          throw new Error("Risposta API non valida");
        }
      } catch (error) {
        console.error("Errore calcolo componenti connesse:", error);
        ui.showToast("Impossibile analizzare le aree isolate.", "error");
      } finally { 
        ui.setCalculating(false); 
      }
    },

    async toggleStreetStatus(uid, scenId, streetName, shouldClose) {
      const ui = useUiStore();
      const edgesToToggle = this.allEdges.filter(e => e.street === streetName);
      let success = false;

      ui.setCalculating(true, "Aggiornamento viabilità in corso...");
      try {
        for (const edge of edgesToToggle) {
          const isClosed = this.activeClosureIds.includes(edge.id);
          if ((shouldClose && !isClosed) || (!shouldClose && isClosed)) {
            
            const res = shouldClose 
              ? await EdgeService.addEdgeClosure(scenId, edge.id)
              : await EdgeService.removeEdgeClosure(scenId, edge.id);

            if (res) {
              const idx = this.activeClosureIds.indexOf(edge.id);
              idx > -1 ? this.activeClosureIds.splice(idx, 1) : this.activeClosureIds.push(edge.id);
              success = true;
            }
          }
        }
      } catch (error) {
        console.error("Errore toggleStreetStatus:", error);
        ui.showToast("Errore di rete durante l'aggiornamento della via.", "error");
      } finally {
        ui.setCalculating(false);
      }
      return success;
    },

    // 🔥 FIX: Ora chiama add/remove al posto del defunto toggleEdge
    async toggleEdgeStatus(uid, scenId, edgeId) {
      const ui = useUiStore();
      ui.setCalculating(true, "Modifica stato arco...");
      try {
        const isClosed = this.activeClosureIds.includes(edgeId);
        
        // Determiniamo dinamicamente quale rotta chiamare
        const res = isClosed 
          ? await EdgeService.removeEdgeClosure(scenId, edgeId)
          : await EdgeService.addEdgeClosure(scenId, edgeId);

        if (res) {
          const idx = this.activeClosureIds.indexOf(edgeId);
          idx > -1 ? this.activeClosureIds.splice(idx, 1) : this.activeClosureIds.push(edgeId);
          return true;
        } else {
          throw new Error("Errore API su toggleEdge");
        }
      } catch (error) {
        console.error("Errore toggleEdgeStatus:", error);
        ui.showToast("Impossibile modificare lo stato del tratto.", "error");
        return false;
      } finally {
        ui.setCalculating(false);
      }
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
        if (res && res.path) {
          this.dijkstraPath = res.path;
        } else {
          throw new Error("Percorso non calcolabile");
        }
      } catch (e) {
        console.error("Errore calcolo Dijkstra:", e);
        ui.showToast("Impossibile calcolare il percorso ottimale.", "error");
      } finally { 
        ui.setCalculating(false); 
      }
    }
  }
});