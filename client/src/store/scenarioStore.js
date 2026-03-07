import { defineStore } from 'pinia';
import { ScenarioService } from '../services/scenarioService';
import { useUiStore } from './uiStore';
import { useAuthStore } from './authStore';
import { useMapStore } from './mapStore';

export const useScenarioStore = defineStore('scenario', {
  state: () => ({
    scenarios: [],
    activeScenario: null,
    isModified: false,
    pendingAction: null
  }),

  actions: {
    // 1. SCARICA TUTTI GLI SCENARI
    async fetchAllScenarios(uid) {
      try {
        const res = await ScenarioService.getAllScenarios(uid);
        if (res && res.scenarios) {
          this.scenarios = res.scenarios;
        }
      } catch (error) {
        console.error("Errore nel recupero degli scenari:", error);
      }
    },

    // 2. CREAZIONE NUOVO SCENARIO
    async createScenario() {
      const auth = useAuthStore();
      const map = useMapStore();
      const ui = useUiStore();
      
      ui.setCalculating(true, "Creazione nuovo scenario...");
      try {
        const res = await ScenarioService.createScenario(auth.uid);
        if (res && res.scen) {
          this.activeScenario = res.scen;
          
          // 🔥 FONDAMENTALE: Resetta la mappa (chiusure, percorsi, ecc.) per il nuovo scenario
          map.activeClosureIds = [];
          map.dijkstraPath = [];
          map.connectedComponents = [];
          this.isModified = false;
          
          await this.fetchAllScenarios(auth.uid);
          ui.showToast("Nuovo scenario creato con successo!", "success");
        }
      } catch (error) {
        console.error("Errore nella creazione dello scenario:", error);
        ui.showToast("Errore nella creazione dello scenario.", "error");
      } finally {
        ui.setCalculating(false);
      }
    },

    // 3. SELEZIONE SCENARIO (con controllo modifiche non salvate)
    async selectScenario(scen_id) {
      const isDifferent = this.activeScenario && String(this.activeScenario.id) !== String(scen_id);
      
      // Se l'utente ha modifiche pendenti, apriamo il modal di avviso
      if (this.isModified && isDifferent) {
        this.pendingAction = { type: 'select', targetId: scen_id };
        const ui = useUiStore();
        ui.openModal('savePrompt'); 
        return;
      }
      await this._executeSelectScenario(scen_id);
    },

    // 4. ESECUZIONE REALE DELLA SELEZIONE E TRADUZIONE GRAFO
    async _executeSelectScenario(scen_id) {
      const auth = useAuthStore();
      const map = useMapStore();
      const ui = useUiStore();

      this.isModified = false; 
      this.pendingAction = null;
      ui.setCalculating(true, "Caricamento scenario...");

      try {
        const res = await ScenarioService.selectScenario(auth.uid, scen_id);
        
        if (res && res.scenario) {
          this.activeScenario = res.scenario;
          
          // 🔥 MAGIA DI TRADUZIONE: Dal DB (Coordinate UTM) -> Alla RAM di Vue (ID Leaflet)
          if (res.scenario.closed_segments && Array.isArray(res.scenario.closed_segments)) {
            map.activeClosureIds = res.scenario.closed_segments
              .map(serverEdge => map._findEdgeIdByNodes(serverEdge))
              .filter(id => id !== null); // Scarta eventuali errori topologici o discrepanze
          } else {
            map.activeClosureIds = [];
          }

          // Resetta calcoli precedenti rimasti a schermo
          map.dijkstraPath = [];
          map.connectedComponents = [];

          ui.showToast("Scenario caricato correttamente.", "success");
        }
      } catch (error) {
        console.error("Errore nel caricamento dello scenario:", error);
        ui.showToast("Errore nel caricamento dello scenario.", "error");
      } finally {
        ui.setCalculating(false);
      }
    },

    // 5. SALVATAGGIO SCENARIO
    async saveCurrentScenario() {
      const auth = useAuthStore();
      const ui = useUiStore();
      
      if (!this.activeScenario) return;

      ui.setCalculating(true, "Salvataggio in corso...");
      try {
        const res = await ScenarioService.saveScenario(auth.uid, this.activeScenario.id);
        if (res && res.saved) {
          this.isModified = false;
          ui.showToast("Scenario salvato con successo!", "success");
        } else {
          throw new Error("Salvataggio fallito lato server.");
        }
      } catch (error) {
        console.error("Errore nel salvataggio:", error);
        ui.showToast("Errore durante il salvataggio.", "error");
      } finally {
        ui.setCalculating(false);
      }
    },

    // 6. DUPLICAZIONE SCENARIO
    async duplicateScenario(scen_id) {
      if (this.isModified) {
        this.pendingAction = { type: 'duplicate', targetId: scen_id };
        const ui = useUiStore();
        ui.openModal('savePrompt');
        return;
      }
      await this._executeDuplicateScenario(scen_id);
    },

    async _executeDuplicateScenario(scen_id) {
      const auth = useAuthStore();
      const ui = useUiStore();
      ui.setCalculating(true, "Duplicazione in corso...");
      try {
        // Attenzione: come da D2, qui il payload passa "scenario", non "scen_id"
        const res = await ScenarioService.duplicateScenario(auth.uid, scen_id);
        if (res && res.scen) {
          await this.fetchAllScenarios(auth.uid);
          ui.showToast("Pratica duplicata con successo!", "success");
        }
      } catch (error) {
        console.error("Errore duplicazione:", error);
        ui.showToast("Impossibile duplicare la pratica.", "error");
      } finally {
        ui.setCalculating(false);
      }
    },

    // 7. AGGIORNAMENTO ETICHETTA (Locale e/o Server)
    updateScenarioLabel(newLabel) {
      if (!this.activeScenario || this.activeScenario.label === newLabel) return; 
      
      this.activeScenario = { ...this.activeScenario, label: newLabel };
      const index = this.scenarios.findIndex(s => String(s.id) === String(this.activeScenario.id));
      if (index !== -1) {
        this.scenarios[index].label = newLabel;
      }
      this.isModified = true;
    },
    
    // 8. ELIMINAZIONE SCENARIO
    async deleteScenario(scen_id) {
      const auth = useAuthStore();
      const map = useMapStore();
      const ui = useUiStore();
      
      ui.setCalculating(true, "Eliminazione scenario...");
      try {
        const res = await ScenarioService.deleteScenario(auth.uid, scen_id);
        if (res && res.deleted) {
          
          // Se stiamo eliminando lo scenario che stiamo attualmente visualizzando, svuotiamo la mappa
          if (this.activeScenario && String(this.activeScenario.id) === String(scen_id)) {
            this.activeScenario = null;
            map.activeClosureIds = [];
            map.dijkstraPath = [];
            map.connectedComponents = [];
            this.isModified = false;
          }
          
          await this.fetchAllScenarios(auth.uid);
          ui.showToast("Scenario eliminato con successo.", "success");
        }
      } catch (error) {
        console.error("Errore cancellazione:", error);
        ui.showToast("Errore durante l'eliminazione dello scenario.", "error");
      } finally {
        ui.setCalculating(false);
      }
    },

    // 9. RISOLUZIONE AZIONI IN SOSPESO (dopo il popup di salvataggio)
    async resolvePendingAction() {
      if (!this.pendingAction) return;
      const { type, targetId } = this.pendingAction;
      
      if (type === 'select') {
        await this._executeSelectScenario(targetId);
      } else if (type === 'duplicate') {
        await this._executeDuplicateScenario(targetId);
      }
      
      this.pendingAction = null;
    }
  }
});