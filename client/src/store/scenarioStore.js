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
        const datiReali = res.data || res;
        const list = Array.isArray(datiReali) ? datiReali : (datiReali.scenarios || []);
        
        // 🔥 FIX FRONTEND: Creiamo un alias 'id' per mantenere compatibili i template Vue
        this.scenarios = list.map(s => ({
          ...s,
          id: s._id || s.id 
        }));
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
        const newScen = res.data || res.scen || res;
        
        if (newScen && (newScen._id || newScen.id)) {
          newScen.id = newScen._id || newScen.id; // Alias per Vue
          this.activeScenario = newScen;
          
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
      // Usiamo l'operatore logico per supportare sia id che _id dal template Vue
      const isDifferent = this.activeScenario && String(this.activeScenario._id || this.activeScenario.id) !== String(scen_id);
      
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
        // Troviamo lo scenario locale e prendiamo il suo _id reale per il backend
        const target = this.scenarios.find(s => String(s._id || s.id) === String(scen_id));
        if (!target) throw new Error("Scenario non trovato in memoria locale");

        const real_id = target._id || target.id;
        const res = await ScenarioService.selectScenario(auth.uid, real_id);
        
        // Assegna lo scenario locale come attivo (così abbiamo subito i dati per la UI)
        this.activeScenario = target;
        
        const serverData = res.scenario || res.data || res;
        
        // 🔥 MAGIA DI TRADUZIONE: Dal DB (Coordinate UTM) -> Alla RAM di Vue (ID Leaflet)
        if (serverData && serverData.closed_segments && Array.isArray(serverData.closed_segments)) {
          map.activeClosureIds = serverData.closed_segments
            .map(serverEdge => map._findEdgeIdByNodes(serverEdge))
            .filter(id => id !== null);
        } else if (target.closed_segments && Array.isArray(target.closed_segments)) {
          map.activeClosureIds = target.closed_segments
            .map(serverEdge => map._findEdgeIdByNodes(serverEdge))
            .filter(id => id !== null);
        } else {
          map.activeClosureIds = [];
        }

        map.dijkstraPath = [];
        map.connectedComponents = [];

        ui.showToast("Scenario caricato correttamente.", "success");
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
        // 🔥 Inviamo sempre _id al backend!
        const real_id = this.activeScenario._id || this.activeScenario.id;
        const res = await ScenarioService.saveScenario(auth.uid, real_id);
        
        if (res && res.saved !== false) { // Gestione blanda del bool
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
        // Troviamo il VERO _id da inviare
        const target = this.scenarios.find(s => String(s._id || s.id) === String(scen_id));
        const real_id = target ? (target._id || target.id) : scen_id;

        const res = await ScenarioService.duplicateScenario(auth.uid, real_id);
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
      const index = this.scenarios.findIndex(s => String(s._id || s.id) === String(this.activeScenario._id || this.activeScenario.id));
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
        // Troviamo il VERO _id
        const target = this.scenarios.find(s => String(s._id || s.id) === String(scen_id));
        const real_id = target ? (target._id || target.id) : scen_id;

        const res = await ScenarioService.deleteScenario(auth.uid, real_id);
        if (res && res.deleted !== false) {
          
          if (this.activeScenario && String(this.activeScenario._id || this.activeScenario.id) === String(real_id)) {
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

    // 9. RISOLUZIONE AZIONI IN SOSPESO
    async resolvePendingAction() {
      if (!this.pendingAction) return;
      const { type, targetId } = this.pendingAction;
      
      if (type === 'select') {
        await this._executeSelectScenario(targetId);
      } else if (type === 'duplicate') {
        await this._executeDuplicateScenario(targetId);
      }
      
      this.pendingAction = null;
    },
    // AGGIORNAMENTO INFORMAZIONI (Label e Descrizione)
    async updateScenarioInfo(scen_id, payload) {
      const auth = useAuthStore();
      const ui = useUiStore();
      
      try {
        ui.setCalculating(true, "Aggiornamento in corso...");
        
        // 1. Troviamo il VERO _id da mandare al backend
        const target = this.scenarios.find(s => String(s._id || s.id) === String(scen_id));
        const real_id = target ? (target._id || target.id) : scen_id;

        // 2. Chiamata al backend
        const res = await ScenarioService.updateScenario(auth.uid, real_id, payload);
        
        if (res) {
          // 3. Aggiorniamo la memoria locale per aggiornare la UI all'istante
          if (target) {
            if (payload.label) target.label = payload.label;
            if (payload.description) target.description = payload.description;
          }
          if (this.activeScenario && String(this.activeScenario._id || this.activeScenario.id) === String(real_id)) {
            if (payload.label) this.activeScenario.label = payload.label;
            if (payload.description) this.activeScenario.description = payload.description;
          }
          ui.showToast("Informazioni aggiornate!", "success");
        }
      } catch (error) {
        console.error("Errore aggiornamento info:", error);
        ui.showToast("Errore nell'aggiornamento dello scenario.", "error");
      } finally {
        ui.setCalculating(false);
      }
    }
  }
});