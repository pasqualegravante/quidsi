import { defineStore } from 'pinia';
import { ApiService } from '../services/api'; 
import { uiStore } from './uiStore';

export const useDssStore = defineStore('dss', {
  state: () => ({
    uid: 'ID_USER_01',
    scenarios: [],
    activeScenario: null,
    activeClosureIds: [],
    connectedComponents: [], 
    dijkstraPath: [],
    selectedEdge: null,
    isModified: false,
    allEdges: [],
    alfa: 0.5,
    poiList: [], 
    routingStartPoint: null, 
    routingEndPoint: null,
    selectionMode: null, // 'start' | 'end' | null
    mapFocusId: null
  }),

  getters: {
    activeClosuresObjects: (state) => {
      return state.allEdges.filter(e => state.activeClosureIds.includes(e.id));
    }
  },

  actions: {
    async fetchAllScenarios() {
      const res = await ApiService.getAllScenarios(this.uid);
      this.scenarios = res.scenarios;
    },

    async selectScenario(scen_id) {
      if (this.isModified) {
        if (!confirm("Hai modifiche non salvate. Salvare prima di cambiare?")) {
           // Scarta
        } else {
           await this.saveCurrentScenario();
        }
      }
      const res = await ApiService.selectScenario(this.uid, scen_id);
      this.activeScenario = res.scenario;
      this.activeClosureIds = res.scenario.closed_segments || [];
      this.alfa = res.scenario.alfa || 0.5;
      this.isModified = false;
      this.connectedComponents = [];
      this.dijkstraPath = [];
      this.routingStartPoint = null;
      this.routingEndPoint = null;
    },

    async saveCurrentScenario() {
      if (!this.activeScenario) return;
      const res = await ApiService.saveScenario(this.uid, this.activeScenario.id);
      if (res.saved) {
        this.isModified = false;
        uiStore.showToast("Scenario salvato con successo!");
      }
    },

    async duplicateScenario(scen_id) {
      if (this.isModified) {
        if (confirm("Salvare le modifiche attuali prima di duplicare?")) {
          await this.saveCurrentScenario();
        }
      }
      const res = await ApiService.duplicateScenario(this.uid, scen_id);
      if (res.scen) {
        await this.fetchAllScenarios();
        uiStore.showToast("Scenario duplicato!");
      }
    },

    async deleteScenario(scen_id) {
      const res = await ApiService.deleteScenario(this.uid, scen_id);
      if (res.deleted) {
        await this.fetchAllScenarios();
      }
    },

    async toggleEdgeStatus(edgeId) {
      const res = await ApiService.toggleEdge(this.uid, this.activeScenario.id, edgeId);
      if (res.toggled) {
        this.isModified = true;
        const idx = this.activeClosureIds.indexOf(edgeId);
        if (idx > -1) this.activeClosureIds.splice(idx, 1);
        else this.activeClosureIds.push(edgeId);
      }
    },

    async toggleStreetStatus(streetName, forceClose) {
      const streetSegments = this.allEdges.filter(e => e.street === streetName);
      for (const segment of streetSegments) {
        const isCurrentlyClosed = this.activeClosureIds.includes(segment.id);
        if ((forceClose && !isCurrentlyClosed) || (!forceClose && isCurrentlyClosed)) {
          await this.toggleEdgeStatus(segment.id);
        }
      }
    },

    // AZIONI SELEZIONE MAPPA
    setSelectionMode(mode) {
      this.selectionMode = this.selectionMode === mode ? null : mode;
    },
    
    setRoutingPoint(edgePayload) {
      if (this.selectionMode === 'start') {
        this.routingStartPoint = edgePayload;
      } else if (this.selectionMode === 'end') {
        this.routingEndPoint = edgePayload;
      }
      this.selectionMode = null; 
    },

    async calculateDijkstra(startId, endId) {
      uiStore.isCalculating = true;
      try {
        const res = await ApiService.calculateDijkstra(this.uid, this.activeScenario.id, { start: startId, end: endId, alfa: this.alfa });
        this.dijkstraPath = res.edges;
      } finally { uiStore.isCalculating = false; }
    },

    async calculateConnessione() {
      uiStore.isCalculating = true;
      try {
        const res = await ApiService.calculateConnectedComponents(this.uid, this.activeScenario.id);
        this.connectedComponents = res.CCS;
      } finally { uiStore.isCalculating = false; }
    }
  }
});