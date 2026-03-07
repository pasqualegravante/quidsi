import { defineStore } from 'pinia';
import { useAuthStore } from './authStore';
import { useUiStore } from './uiStore';
import { EdgeService } from '../services/edgeService';      
import { RoutingService } from '../services/routingService'; 
import { useScenarioStore } from './scenarioStore';

// 🔥 CONTROLLO ROBUSTO: cast a Number e tolleranza di mezzo metro per gli arrotondamenti float
const isSameNode = (nodeA, nodeB) => {
  if (!nodeA || !nodeB || !Array.isArray(nodeA) || !Array.isArray(nodeB)) return false;
  return Math.abs(Number(nodeA[0]) - Number(nodeB[0])) < 0.5 && 
         Math.abs(Number(nodeA[1]) - Number(nodeB[1])) < 0.5;
};

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
    
    resetSelection() {
      this.selectedEdges = [];
    },
    
    handleEdgeSelection(payload) {
      if (payload.isMulti) {
        const idx = this.selectedEdges.findIndex(e => String(e.id) === String(payload.id));
        if (idx > -1) this.selectedEdges.splice(idx, 1);
        else this.selectedEdges.push(payload);
      } else {
        this.selectedEdges = [payload];
      }
    },

    // 🔄 TRADUTTORE: Da Coordinate Server a ID Leaflet
    _findEdgeIdByNodes(serverEdge) {
      if (!serverEdge || serverEdge.length < 2) return null;
      
      const match = this.allEdges.find(e => {
        if (!e.nodes || e.nodes.length < 2) return false;
        
        // Verifica in senso diretto e inverso 
        const isDirect = isSameNode(e.nodes[0], serverEdge[0]) && isSameNode(e.nodes[1], serverEdge[1]);
        const isReverse = isSameNode(e.nodes[0], serverEdge[1]) && isSameNode(e.nodes[1], serverEdge[0]);
        
        return isDirect || isReverse;
      });
      
      return match ? match.id : null;
    },

    async toggleEdgeStatus(uid, scen_id, edgeId) {
      const ui = useUiStore();
      ui.setCalculating(true, "Modifica stato arco...");
      try {
        const edgeData = this.allEdges.find(e => String(e.id) === String(edgeId));
        if (!edgeData || !edgeData.nodes) throw new Error("Dati topologici mancanti");

        const res = await EdgeService.toggleEdge(uid, scen_id, edgeData.nodes);

        if (res && res.toggled !== undefined) {
          const idx = this.activeClosureIds.indexOf(edgeId);
          idx > -1 ? this.activeClosureIds.splice(idx, 1) : this.activeClosureIds.push(edgeId);
          return true;
        } else {
          throw new Error("Risposta anomala dal server");
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
        
        if (res && res.edges) {
          const pathIds = res.edges
                            .map(serverEdge => this._findEdgeIdByNodes(serverEdge))
                            .filter(id => id !== null); 
          this.dijkstraPath = pathIds;
        } else {
          throw new Error("Percorso non calcolabile o grafo non connesso");
        }
      } catch (e) {
        console.error("Errore calcolo Dijkstra:", e);
        ui.showToast("Impossibile calcolare il percorso ottimale.", "error");
        this.dijkstraPath = [];
      } finally { 
        ui.setCalculating(false); 
      }
    },

    async calculateConnectedComponents() {
      const ui = useUiStore();
      const auth = useAuthStore();
      const scenario = useScenarioStore();
      
      ui.setCalculating(true, "Calcolo componenti connesse...");
      try {
        const res = await RoutingService.calculateConnectedComponents(auth.uid, scenario.activeScenario.id);
        
        if (res && res.CCS) {
          this.connectedComponents = res.CCS.map(ccGroup => {
            return ccGroup
                     .map(serverEdge => this._findEdgeIdByNodes(serverEdge))
                     .filter(id => id !== null);
          });
        }
      } catch (e) {
        console.error("Errore calcolo Componenti Connesse:", e);
        ui.showToast("Impossibile calcolare le componenti connesse.", "error");
        this.connectedComponents = [];
      } finally {
        ui.setCalculating(false);
      }
    }
  }
});