import { apiClient } from './apiClient';

export const ScenarioService = {
  
  async getAllScenarios(uid) {
    return await apiClient.get(`/scenarios?uid=${uid}`);
  },

  async selectScenario(uid, scenarioId) {
    return await apiClient.get(`/scenarios/${scenarioId}?uid=${uid}`);
  },

  async saveScenario(uid, scenarioId) {
    return await apiClient.post(`/scenarios/${scenarioId}/save`, { uid });
  },

  async createScenario(uid) {
    return await apiClient.post('/scenarios', { uid });
  },

  async updateScenario(uid, scenarioId, payload) {
    // Payload contiene { label, description }
    return await apiClient.put(`/scenarios/${scenarioId}`, { uid, ...payload });
  },

  async duplicateScenario(uid, scenarioId) {
    return await apiClient.post(`/scenarios/${scenarioId}/duplicate`, { uid });
  },

  async deleteScenario(uid, scenarioId) {
    return await apiClient.delete(`/scenarios/${scenarioId}?uid=${uid}`);
  }
};