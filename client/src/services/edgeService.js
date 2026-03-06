import { apiClient } from './apiClient';

export const EdgeService = {
  async toggleEdge(uid, scenarioId, edgeId) {
    return await apiClient.post('/edge/toggle', { 
      uid, 
      scenarioId, 
      edgeId: String(edgeId) 
    });
  }
};