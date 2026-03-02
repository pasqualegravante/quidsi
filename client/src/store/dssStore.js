import { defineStore } from 'pinia';
import { ApiService } from '../services/api'; 
import { uiStore } from './uiStore';

export const useDssStore = defineStore('dss', {
  state: () => ({
    uid: 'ID_USER_01', // Identificativo utente per le sessioni
    scenarios: [],     // Lista di tutti gli scenari dell'utente
    activeScenario: null,
    activeClosureIds: [], // Mima il grafo presente sul server
    connectedComponents: [], // CCS: [[edge], [edge]]
    dijkstraPath: [],
    selectedEdge: null,
    isModified: false, // Flag per modifiche non salvate
    allEdges: [],      // Indice locale per filtri (es. ricerca per via)
    alfa: 0.5,         // Peso per la formula weight(X)
  }),

  getters: {
    // Filtra gli oggetti arco completi partendo dagli ID chiusi
    activeClosuresObjects: (state) => {
      return state.allEdges.filter(e => state.activeClosureIds.includes(e.id));
    }
  },

  actions: {
    /**
     * GESTIONE SCENARI
     */
    async fetchAllScenarios() {
      const res = await ApiService.getAllScenarios(this.uid); //
      this.scenarios = res.scenarios;
    },

    async selectScenario(scen_id) {
      // Verifica se salvare prima di cambiare scenario
      if (this.isModified) {
        if (!confirm("Hai modifiche non salvate. Salvare prima di cambiare?")) {
           // Se l'utente preme "Scarta", procediamo comunque resettando
        } else {
           await this.saveCurrentScenario();
        }
      }
      
      const res = await ApiService.selectScenario(this.uid, scen_id); //
      this.activeScenario = res.scenario; //
      this.activeClosureIds = res.scenario.closed_segments || []; //
      this.alfa = res.scenario.alfa || 0.5; //
      this.isModified = false;
      this.connectedComponents = []; // Reset calcoli precedenti
      this.dijkstraPath = [];
    },

    async saveCurrentScenario() {
      if (!this.activeScenario) return;
      const res = await ApiService.saveScenario(this.uid, this.activeScenario.id); //
      if (res.saved) {
        this.isModified = false; //
        uiStore.showToast("Scenario salvato con successo!");
      }
    },

    async duplicateScenario(scen_id) {
      // Chiede il salvataggio prima della duplicazione
      if (this.isModified) {
        if (confirm("Salvare le modifiche attuali prima di duplicare?")) {
          await this.saveCurrentScenario();
        }
      }
      const res = await ApiService.duplicateScenario(this.uid, scen_id); //
      if (res.scen) {
        await this.fetchAllScenarios();
        uiStore.showToast("Scenario duplicato!");
      }
    },

    /**
     * GESTIONE GRAFO (TRATTI E VIE)
     */
    async toggleEdgeStatus(edgeId) {
      // Chiamata all'endpoint unico di toggle
      const res = await ApiService.toggleEdge(this.uid, this.activeScenario.id, edgeId);
      if (res.toggled) {
        this.isModified = true; //
        const idx = this.activeClosureIds.indexOf(edgeId);
        if (idx > -1) this.activeClosureIds.splice(idx, 1); // Riapri
        else this.activeClosureIds.push(edgeId); // Chiudi
      }
    },

    // Funzione massiva per "Chiudi/Riapri VIA"
    async toggleStreetStatus(streetName, forceClose) {
      // 1. Individua tutti i segmenti (archi) della via selezionata
      const streetSegments = this.allEdges.filter(e => e.street === streetName);
      
      for (const segment of streetSegments) {
        const isCurrentlyClosed = this.activeClosureIds.includes(segment.id);
        
        // Esegue l'azione solo se lo stato attuale non corrisponde a quello desiderato
        if ((forceClose && !isCurrentlyClosed) || (!forceClose && isCurrentlyClosed)) {
          await this.toggleEdgeStatus(segment.id);
        }
      }
    },

    /**
     * FUNZIONI ALGORITMICHE
     */
    async calculateDijkstra(start, end) {
      uiStore.isCalculating = true;
      try {
        // Calcola il percorso minimo considerando il peso alfa
        const res = await ApiService.calculateDijkstra(this.uid, this.activeScenario.id, { 
          start, 
          end, 
          alfa: this.alfa 
        });
        this.dijkstraPath = res.edges; //
      } finally { uiStore.isCalculating = false; }
    },

    async calculateConnessione() {
      uiStore.isCalculating = true;
      try {
        // Calcola le componenti isolate dallo scenario di chiusure
        const res = await ApiService.calculateConnectedComponents(this.uid, this.activeScenario.id);
        this.connectedComponents = res.CCS; // [[edge]]
        uiStore.showToast(`Trovate ${res.num_of_ccs} aree isolate.`); //
      } finally { uiStore.isCalculating = false; }
    }
  }
});