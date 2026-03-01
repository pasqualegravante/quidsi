import { defineStore } from 'pinia';
import { ApiService } from '../services/api'; // Il file api.js aggiornato prima
import { uiStore } from './uiStore';

export const useDssStore = defineStore('dss', {
  state: () => ({
    uid: 'ID_UTENTE_ATTUALE', // In produzione deriverà dal JWT del login [cite: 74-75]
    currentScenarioId: null,
    scenariosList: [],
    
    // Stato del grafo mimato dal server 
    activeClosureIds: [], 
    dijkstraPath: [],
    connectedComponents: [], // Array di array di archi [cite: 195]
    
    selectedEdge: null,
    mapFocusId: null
  }),

  actions: {
    // --- GESTIONE SCENARI ---
    async fetchAllScenarios() {
      try {
        uiStore.isCalculating = true;
        const res = await ApiService.getAllScenarios(this.uid);
        this.scenariosList = res.scenarios; // [cite: 125-127]
      } catch (error) {
        console.error("Errore recupero scenari", error);
      } finally {
        uiStore.isCalculating = false;
      }
    },

    async selectScenario(scen_id) {
      try {
        uiStore.isCalculating = true;
        const res = await ApiService.selectScenario(this.uid, scen_id);
        this.currentScenarioId = res.scenario.id;
        // Il client ridisegna il grafo ricolorando gli archi rimossi indicati [cite: 140]
        this.activeClosureIds = res.scenario.closed_segments || [];
        this.dijkstraPath = []; // Reset calcoli precedenti
        this.connectedComponents = [];
      } catch (error) {
        console.error("Errore selezione scenario", error);
      } finally {
        uiStore.isCalculating = false;
      }
    },

    // --- FUNZIONI ALGORITMICHE ---
    async calculateDijkstra(startNode, endNode) {
      try {
        uiStore.isCalculating = true;
        const res = await ApiService.calculateDijkstra(this.uid, this.currentScenarioId, { startNode, endNode });
        this.dijkstraPath = res.edges; // [cite: 177-179]
      } catch (error) {
        console.error("Errore Dijkstra", error);
      } finally {
        uiStore.isCalculating = false;
      }
    },

    async calculateConnessione() {
      try {
        uiStore.isCalculating = true;
        const res = await ApiService.calculateConnectedComponents(this.uid, this.currentScenarioId);
        // Il client riceve un array di array di archi (le componenti connesse) [cite: 195]
        this.connectedComponents = res.CCS; // [cite: 192, 193]
      } catch (error) {
        console.error("Errore Connessione", error);
      } finally {
        uiStore.isCalculating = false;
      }
    },

    // --- GESTIONE ARCHI ---
    async toggleEdgeStatus(edgeId) {
      try {
        uiStore.isCalculating = true;
        const res = await ApiService.toggleEdge(this.uid, this.currentScenarioId, edgeId);
        
        // Il client legge toggled e ridisegna il grafo se true [cite: 209]
        if (res.toggled) {
          const index = this.activeClosureIds.indexOf(edgeId);
          if (index > -1) {
            this.activeClosureIds.splice(index, 1); // Riapri
          } else {
            this.activeClosureIds.push(edgeId); // Chiudi
          }
        }
      } catch (error) {
        console.error("Errore toggle arco", error);
      } finally {
        uiStore.isCalculating = false;
      }
    }
  }
});