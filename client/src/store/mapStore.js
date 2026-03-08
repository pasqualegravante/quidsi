import { defineStore } from 'pinia';
import { useAuthStore } from './authStore';
import { useUiStore } from './uiStore';
import { EdgeService } from '../services/edgeService';      
import { RoutingService } from '../services/routingService'; 
import { useScenarioStore } from './scenarioStore';

// 🔥 CONTROLLO ROBUSTO: cast a Number e tolleranza di mezzo metro per gli arrotondamenti float tra JS e Python
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

    // 🔄 TRADUTTORE BLINDATO: Da Coordinate Server a ID Leaflet
    _findEdgeIdByNodes(serverEdge) {
      if (!serverEdge || serverEdge.length < 2) return null;
      
      const parseNode = (n) => typeof n === 'string' ? n.split(' ').map(Number) : n;
      const sN1 = parseNode(serverEdge[0]);
      const sN2 = parseNode(serverEdge[1]);

      const match = this.allEdges.find(e => {
        if (!e.nodes || e.nodes.length < 2) return false;
        const eN1 = e.nodes[0];
        const eN2 = e.nodes[1];
        
        // Verifica in senso diretto e inverso
        return (isSameNode(eN1, sN1) && isSameNode(eN2, sN2)) || 
               (isSameNode(eN1, sN2) && isSameNode(eN2, sN1));
      });
      
      return match ? match.id : null;
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
            // Mandiamo le coordinate a Python
            const res = await EdgeService.toggleEdge(uid, scenId, edge.nodes);
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

    async toggleEdgeStatus(uid, scenId, edgeId) {
      const ui = useUiStore();
      ui.setCalculating(true, "Modifica stato arco...");
      try {
        const edgeData = this.allEdges.find(e => String(e.id) === String(edgeId));
        if (!edgeData || !edgeData.nodes) throw new Error("Dati topologici mancanti");

        const res = await EdgeService.toggleEdge(uid, scenId, edgeData.nodes);

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
        
        // 🔥 PYTHON BYPASS: Il server restituisce un array di nodi ["N1", "N2", "N3"]. Li assembliamo in archi.
        if (res && res.res && Array.isArray(res.res)) {
          const nodesStr = res.res;
          const pathIds = [];
          for(let i = 0; i < nodesStr.length - 1; i++) {
             const edgeId = this._findEdgeIdByNodes([nodesStr[i], nodesStr[i+1]]);
             if(edgeId) pathIds.push(edgeId);
          }
          this.dijkstraPath = pathIds;
        } else {
          throw new Error("Percorso non calcolabile");
        }
      } catch (e) {
        console.error("Errore calcolo Dijkstra:", e);
        ui.showToast("Nessun percorso trovato tra i due punti.", "error");
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
        
        if (res && res.CCS && Array.isArray(res.CCS)) {
          this.connectedComponents = res.CCS.map(ccGroup => {
            return ccGroup
                     .map(serverEdge => this._findEdgeIdByNodes(serverEdge))
                     .filter(id => id !== null);
          });
        } else {
          // Prevenzione crash se il backend Python restituisce solo il numero nx.number_strongly_connected_components(G)
          ui.showToast(`Calcolo terminato: Trovate ${res.res || 0} componenti connesse.`, "info");
          this.connectedComponents = [];
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