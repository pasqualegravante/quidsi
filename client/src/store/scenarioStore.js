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
      if (this.isModified) {
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
      const res = await ScenarioService.selectScenario(auth.uid, scen_id);
      
      this.activeScenario = res.scenario;
      this.isModified = false;
      
      map.activeClosureIds = res.scenario.closed_segments || [];
      map.alfa = res.scenario.alfa || 0.5;
      map.resetSelection();
    },

    async saveCurrentScenario() {
      if (!this.activeScenario) return;
      const auth = useAuthStore();
      const ui = useUiStore();
      const res = await ScenarioService.saveScenario(auth.uid, this.activeScenario.id);
      if (res.saved) {
        this.isModified = false;
        ui.showToast("Scenario salvato!");
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
    },

    async createScenario() {
      const auth = useAuthStore();
      const res = await ScenarioService.createScenario(auth.uid);
      if (res && res.scen) {
        await this.fetchAllScenarios(auth.uid);
        await this.selectScenario(res.scen.id);
      }
    },

    async updateScenarioInfo(scen_id, label, desc) {
      const auth = useAuthStore();
      const res = await ScenarioService.updateScenario(auth.uid, scen_id, { label, description: desc });
      if (res.updated) {
        await this.fetchAllScenarios(auth.uid);
      }
    },

    async duplicateScenario(scen_id) {
      if (this.isModified && this.activeScenario && this.activeScenario.id === scen_id) {
        this.pendingAction = { type: 'duplicate', targetId: scen_id };
        const ui = useUiStore();
        ui.openModal('savePrompt');
        return;
      }
      await this._executeDuplicateScenario(scen_id);
    },

    async _executeDuplicateScenario(scen_id) {
      const auth = useAuthStore();
      const res = await ScenarioService.duplicateScenario(auth.uid, scen_id);
      if (res && res.scen) {
        await this.fetchAllScenarios(auth.uid);
      }
    },

    async deleteScenario(scen_id) {
      const auth = useAuthStore();
      const res = await ScenarioService.deleteScenario(auth.uid, scen_id);
      if (res.deleted) {
        if (this.activeScenario && this.activeScenario.id === scen_id) {
          this.activeScenario = null;
          const map = useMapStore();
          map.activeClosureIds = [];
          map.resetSelection();
        }
        await this.fetchAllScenarios(auth.uid);
      }
    }
  }
});