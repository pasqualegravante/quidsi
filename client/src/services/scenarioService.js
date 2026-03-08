import { apiClient } from './apiClient';

export const ScenarioService = {
  async getAllScenarios(userId) {
    return await apiClient.post('/engine/scenario/get-all', { user_id: userId });
  },
  
  async selectScenario(userId, scenarioId) {
    // Perfettamente allineato a scenario_req: richiede _id e user_id
    return await apiClient.post('/engine/scenario/load', { user_id: userId, _id: scenarioId });
  },
  
  async saveScenario(userId, scenarioId) {
    return await apiClient.post('/engine/scenario/save', { user_id: userId, _id: scenarioId });
  },
  
  async createScenario(userId) {
    // Invia _id come stringa generica come richiesto dal tuo documento
    return await apiClient.post('/engine/scenario/new', { user_id: userId, _id: "new_scenario" }); 
  },
  
  async updateScenario(userId, scenarioId, payload) {
    return await apiClient.post('/engine/scenario/update', { user_id: userId, _id: scenarioId, ...payload });
  },
  
  async duplicateScenario(userId, scenarioId) {
    return await apiClient.post('/engine/scenario/duplicate', { user_id: userId, _id: scenarioId });
  },
  
  async deleteScenario(userId, scenarioId) {
    // Delete usa il body con _id e user_id, apiClient lo supporta correttamente
    return await apiClient.delete('/engine/scenario/delete', { user_id: userId, _id: scenarioId });
  }
};