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
    async fetchAllScenarios(uid) {
      const res = await ScenarioService.getAllScenarios(uid);
      this.scenarios = res.scenarios;
    },

    async selectScenario(scen_id) {
      const isDifferent = this.activeScenario && String(this.activeScenario.id) !== String(scen_id);
      if (this.isModified && isDifferent) {
        this.pendingAction = { type: 'select', targetId: scen_id };
        const ui = useUiStore();
        ui.openModal('savePrompt'); 
        return;
      }
      await this._executeSelectScenario(scen_id);
    },

    async _executeSelectScenario(scen_id) {
      const auth = useAuthStore();
      const map = useMapStore();
      const ui = useUiStore();

      this.isModified = false; 
      this.pendingAction = null;

      try {
        const res = await ScenarioService.selectScenario(auth.uid, scen_id);
        this.activeScenario = res.scenario;
        map.activeClosureIds = res.scenario.closed_segments || [];
        map.alfa = res.scenario.alfa || 0.5;
        map.resetSelection();
        this.isModified = false; 
      } catch (error) {
        ui.showToast("Errore nel caricamento della pratica.", "error");
      }
    },

    async saveCurrentScenario() {
      if (!this.activeScenario) return;
      const auth = useAuthStore();
      const ui = useUiStore();
      try {
        const res = await ScenarioService.saveScenario(auth.uid, this.activeScenario.id);
        if (res.saved) {
          this.isModified = false;
          ui.showToast("Pratica salvata correttamente!");
        }
      } catch (error) {
        ui.showToast("Errore durante il salvataggio.", "error");
      }
    },

    async resolvePendingAction(saveFirst) {
      const ui = useUiStore();
      ui.closeModal();
      const action = this.pendingAction;
      this.pendingAction = null;

      if (saveFirst) {
        await this.saveCurrentScenario();
      } else {
        this.isModified = false;
      }

      if (action && action.type === 'select') await this._executeSelectScenario(action.targetId);
      if (action && action.type === 'duplicate') await this._executeDuplicateScenario(action.targetId);
      if (action && action.type === 'create') await this._executeCreateScenario(); // 🔥 Fix Nuova Pratica
    },

    // 🔥 FIX: Protezione su "Nuova Pratica"
    async createScenario() {
      if (this.isModified) {
        this.pendingAction = { type: 'create' };
        const ui = useUiStore();
        ui.openModal('savePrompt');
        return;
      }
      await this._executeCreateScenario();
    },

    async _executeCreateScenario() {
      const auth = useAuthStore();
      const ui = useUiStore();
      const res = await ScenarioService.createScenario(auth.uid);
      if (res && res.scen) {
        await this.fetchAllScenarios(auth.uid);
        await this._executeSelectScenario(res.scen.id);
        ui.showToast("Nuova pratica creata.");
      }
    },

    async updateScenarioInfo(scen_id, label, desc) {
      const auth = useAuthStore();
      const res = await ScenarioService.updateScenario(auth.uid, scen_id, { label, description: desc });
      if (res.updated) {
        await this.fetchAllScenarios(auth.uid);
        if (this.activeScenario && String(this.activeScenario.id) === String(scen_id)) {
          this.activeScenario = { ...this.activeScenario, label: label, description: desc };
        }
      }
    },

    async duplicateScenario(scen_id) {
      if (this.isModified && this.activeScenario && String(this.activeScenario.id) === String(scen_id)) {
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
        const res = await ScenarioService.duplicateScenario(auth.uid, scen_id);
        if (res && res.scen) {
          await this.fetchAllScenarios(auth.uid);
          ui.showToast("Pratica duplicata!");
        }
      } finally {
        ui.setCalculating(false);
      }
    },

    updateScenarioLabel(newLabel) {
      if (!this.activeScenario || this.activeScenario.label === newLabel) return; 
      this.activeScenario = { ...this.activeScenario, label: newLabel };
      const index = this.scenarios.findIndex(s => String(s.id) === String(this.activeScenario.id));
      if (index !== -1) {
        this.scenarios[index].label = newLabel;
      }
      this.isModified = true;
    },
    
    async deleteScenario(scen_id) {
      const auth = useAuthStore();
      const ui = useUiStore();
      const res = await ScenarioService.deleteScenario(auth.uid, scen_id);
      if (res.deleted) {
        if (this.activeScenario && String(this.activeScenario.id) === String(scen_id)) {
          this.activeScenario = null;
          this.isModified = false;
        }
        await this.fetchAllScenarios(auth.uid);
        ui.showToast("Pratica eliminata.");
      }
    }
  }
});