import { defineStore } from 'pinia';
import { ApiService } from '../services/api_server'; 
import { uiStore } from './uiStore';

export const useDssStore = defineStore('dss', {
  state: () => ({
    isAuthenticated: false,
    uid: '', 
    scenarios: [],
    activeScenario: null,
    activeClosureIds: [],
    connectedComponents: [], 
    dijkstraPath: [],
    
    selectedEdges: [], // Array degli archi attivi
    
    isModified: false,
    allEdges: [],
    alfa: 0.5, 
    poiList: [], 
    
    routingStartPoint: null, 
    routingEndPoint: null,
    selectionMode: null, 
    mapFocusId: null,

    pendingAction: null, 
    showSavePromptModal: false 
  }),

  getters: {
    activeClosuresObjects: (state) => {
      return state.allEdges.filter(e => state.activeClosureIds.includes(e.id));
    }
  },

  actions: {
    async performLogin(email, password) {
      this.isAuthenticated = true;
      this.uid = "ID_UTENTE_LOGGATO_01"; 
      this.scenarios = [
        { id: 'scen_1', label: 'Scenario di Prova 1', description: 'Questo è un mock' },
        { id: 'scen_2', label: 'Scenario Centro Storico', description: 'Chiusura via dante' }
      ];
    },

    // --- MODIFICATO (BUGFIX 1 & 3): Normalizzazione ID e logica toggle sicura ---
    handleEdgeSelection(payload) {
      // Trasformiamo sempre l'ID in stringa per evitare bug di tipo (int vs string) col DB
      const edgeId = String(payload.id);
      const edgeData = { ...payload, id: edgeId };

      if (payload.isMulti) {
        const index = this.selectedEdges.findIndex(e => String(e.id) === edgeId);
        if (index === -1) {
          this.selectedEdges.push(edgeData);
        } else {
          this.selectedEdges.splice(index, 1);
        }
      } else {
        // Selezione singola: se clicco lo stesso che è già selezionato, lo deseleziono
        if (this.selectedEdges.length === 1 && String(this.selectedEdges[0].id) === edgeId) {
          this.selectedEdges = [];
        } else {
          this.selectedEdges = [edgeData];
        }
      }
    },

    // --- NUOVO (BUGFIX 2): Resetta il focus della mappa ---
    clearMapFocus() {
      this.mapFocusId = null;
    },

    // --- NUOVO: Pulizia totale usata ai cambi scenario ---
    resetSelection() {
      this.selectedEdges = [];
      this.dijkstraPath = [];
      this.connectedComponents = [];
    },

    async fetchAllScenarios() {
      if (!this.uid) return;
      const res = await ApiService.getAllScenarios(this.uid);
      this.scenarios = res.scenarios;
    },

    async createScenario() {
      const res = await ApiService.createScenario(this.uid);
      if (res.scen) {
        await this.fetchAllScenarios();
        uiStore.showToast("Nuovo scenario creato!");
      }
    },

    async selectScenario(scen_id) {
      if (this.isModified) {
        this.pendingAction = { type: 'select', targetId: scen_id };
        this.showSavePromptModal = true;
        return; 
      }
      await this._executeSelectScenario(scen_id);
    },

    async _executeSelectScenario(scen_id) {
      const res = await ApiService.selectScenario(this.uid, scen_id);
      this.activeScenario = res.scenario;
      this.activeClosureIds = res.scenario.closed_segments || [];
      this.alfa = res.scenario.alfa || 0.5;
      this.isModified = false;
      this.resetSelection(); // Utilizziamo la nuova funzione di reset
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
        this.pendingAction = { type: 'duplicate', targetId: scen_id };
        this.showSavePromptModal = true;
        return; 
      }
      await this._executeDuplicateScenario(scen_id);
    },

    async _executeDuplicateScenario(scen_id) {
      const res = await ApiService.duplicateScenario(this.uid, scen_id);
      if (res.scen) {
        await this.fetchAllScenarios();
        uiStore.showToast("Scenario duplicato!");
      }
    },

    async resolvePendingAction(saveFirst) {
      this.showSavePromptModal = false; 
      const action = this.pendingAction;
      this.pendingAction = null; 

      if (saveFirst) {
        await this.saveCurrentScenario(); 
      } else {
        this.isModified = false; 
        if (action.type === 'duplicate' && this.activeScenario) {
            await this._executeSelectScenario(this.activeScenario.id);
        }
      }

      if (action.type === 'select') {
        await this._executeSelectScenario(action.targetId);
      } else if (action.type === 'duplicate') {
        await this._executeDuplicateScenario(action.targetId);
      }
    },

    async deleteScenario(scen_id) {
      const res = await ApiService.deleteScenario(this.uid, scen_id);
      if (res.deleted) {
        await this.fetchAllScenarios();
        uiStore.showToast("Scenario eliminato.");
      }
    },

    async updateScenarioInfo(scen_id, label, description) {
      uiStore.isCalculating = true;
      try {
        const res = await ApiService.updateScenario(this.uid, scen_id, { label, description });
        if (res.updated) {
          const scen = this.scenarios.find(s => s.id === scen_id);
          if (scen) {
            scen.label = label;
            scen.description = description;
          }
          if (this.activeScenario && this.activeScenario.id === scen_id) {
             this.activeScenario.label = label;
             this.activeScenario.description = description;
          }
          uiStore.showToast("Dettagli scenario aggiornati!");
        }
      } finally { uiStore.isCalculating = false; }
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
        const res = await ApiService.calculateDijkstra(this.uid, this.activeScenario.id, { 
          start: startId, 
          end: endId, 
          alfa: this.alfa 
        });
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