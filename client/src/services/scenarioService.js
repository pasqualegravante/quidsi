import { apiClient } from './apiClient';

export const ScenarioService = {
  async getAllScenarios(userId) {
    return await apiClient.post('/engine/scenario/get-all', { user_id: userId });
  },
  async selectScenario(userId, scenarioId) {
    return await apiClient.post('/engine/scenario/load', { user_id: userId, _id: scenarioId });
  },
  async saveScenario(userId, scenarioId) {
    return await apiClient.post('/engine/scenario/save', { user_id: userId, _id: scenarioId });
  },
  async createScenario(userId) {
    // Il documento richiede l'invio di _id come stringa (anche casuale) per la creazione
    return await apiClient.post('/engine/scenario/new', { user_id: userId, _id: "new_scenario" }); 
  },
  async updateScenario(userId, scenarioId, payload) {
    return await apiClient.post('/engine/scenario/update', { user_id: userId, _id: scenarioId, ...payload });
  },
  async duplicateScenario(userId, scenarioId) {
    // Non esplicitamente documentato nell'ultimo D2, ma lo allineiamo
    return await apiClient.post('/engine/scenario/duplicate', { user_id: userId, _id: scenarioId });
  },
  async deleteScenario(userId, scenarioId) {
    return await apiClient.post('/engine/scenario/delete', { user_id: userId, _id: scenarioId });
  }
};