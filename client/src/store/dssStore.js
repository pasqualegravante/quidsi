import { defineStore } from 'pinia';
import { ApiService } from '../services/api_server'; 
import { uiStore } from './uiStore';

export const useDssStore = defineStore('dss', {
  state: () => ({
    isAuthenticated: false, // --- NUOVO --- Flag di autenticazione
    uid: '', // --- MODIFICATO --- Non più hardcodato
    scenarios: [],
    activeScenario: null,
    activeClosureIds: [],
    connectedComponents: [], 
    dijkstraPath: [],
    selectedEdge: null,
    isModified: false,
    allEdges: [],
    alfa: 0.5, // Parametro formula pesi
    poiList: [], 
    
    routingStartPoint: null, 
    routingEndPoint: null,
    selectionMode: null, 
    mapFocusId: null,

    // Variabili di stato per gestire i modali custom di salvataggio
    pendingAction: null, // Oggetto per tracciare cosa l'utente stava cercando di fare: { type: 'select' | 'duplicate', targetId: string }
    showSavePromptModal: false // Flag per mostrare/nascondere il modale
  }),

  getters: {
    activeClosuresObjects: (state) => {
      return state.allEdges.filter(e => state.activeClosureIds.includes(e.id));
    }
  },

  actions: {
    // --- NUOVO --- Azione di Login
    // --- AZIONE DI LOGIN AGGIORNATA PER IL TESTING ---
    async performLogin(email, password) {
      const success = await ApiService.login(email, password);
      if (success) {
        this.isAuthenticated = true;
        this.uid = "ID_UTENTE_LOGGATO_01"; 
        
        // Proviamo a scaricare gli scenari. Se il backend è spento, ignoriamo l'errore 
        // e carichiamo degli scenari fittizi per farti testare l'app!
        try {
          // await this.fetchAllScenarios(); 
        } catch (error) {
          console.warn("⚠️ Backend non raggiungibile per gli scenari. Carico dati di test.");
          
          // Dati fittizi per non avere la sidebar vuota
          this.scenarios = [
            { id: 'scen_1', label: 'Scenario di Prova 1', description: 'Questo è un mock' },
            { id: 'scen_2', label: 'Scenario Centro Storico', description: 'Chiusura via dante' }
          ];
        }
      }
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
        return; // Blocca l'esecuzione, aspetta l'input del modale
      }
      await this._executeSelectScenario(scen_id);
    },

    async _executeSelectScenario(scen_id) {
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
        this.pendingAction = { type: 'duplicate', targetId: scen_id };
        this.showSavePromptModal = true;
        return; // Blocca l'esecuzione
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
        // Se preme SALVA, salviamo nel DB.
        await this.saveCurrentScenario(); 
      } else {
        // Se preme SCARTA o IGNORA, resettiamo il flag di modifica
        this.isModified = false; 
        
        // BUG FIX: Se stavamo duplicando e abbiamo ignorato le modifiche, 
        // dobbiamo ricaricare lo scenario attivo per far sparire le modifiche dal grafo visivo
        if (action.type === 'duplicate' && this.activeScenario) {
            await this._executeSelectScenario(this.activeScenario.id);
        }
      }

      // Infine, eseguiamo l'azione originariamente richiesta
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