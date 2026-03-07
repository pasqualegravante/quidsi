import { apiClient } from './apiClient';

export const ScenarioService = {
  
  // POST /scenario/get-all
  // Payload: { uid: "..." }
  async getAllScenarios(uid) {
    return await apiClient.post('/scenario/get-all', { uid });
  },

  // POST /scenario/select
  // Payload: { uid: "...", scen_id: "..." }
  async selectScenario(uid, scen_id) {
    return await apiClient.post('/scenario/select', { uid, scen_id });
  },

  // POST /scenario/save
  // Payload: { uid: "...", scen_id: "..." }
  async saveScenario(uid, scen_id) {
    return await apiClient.post('/scenario/save', { uid, scen_id });
  },

  // POST /scenario/new
  // Payload: { uid: "..." }
  async createScenario(uid) {
    return await apiClient.post('/scenario/new', { uid });
  },

  // (Non menzionato esplicitamente nelle specifiche attuali, ma mantengo la struttura per la tua UI)
  async updateScenario(uid, scen_id, payload) {
    return await apiClient.post('/scenario/update', { uid, scen_id, ...payload });
  },

  // POST /scenario/duplicate
  // Payload: { uid: "...", scenario: "..." }
  // ATTENZIONE: le specifiche indicano la chiave 'scenario' al posto di 'scen_id' per questo endpoint
  async duplicateScenario(uid, scenario) {
    return await apiClient.post('/scenario/duplicate', { uid, scenario });
  },

  // DELETE /scenario/delete
  // Payload: { uid: "...", scen_id: "..." }
  async deleteScenario(uid, scen_id) {
    return await apiClient.delete('/scenario/delete', { uid, scen_id });
  }
};