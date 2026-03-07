import { apiClient } from './apiClient';

export const EdgeService = {
  
  // Aggiungere una chiusura nel Frontend = Chiedere a Python di ELIMINARE l'arco
  async addEdgeClosure(scenarioId, edgeId) {
    return await apiClient.request('/engine/edge/delete', {
      method: 'DELETE',
      body: JSON.stringify({ id: scenarioId, edges: [String(edgeId)] })
    });
  },
  
  // Rimuovere una chiusura nel Frontend = Chiedere a Python di AGGIUNGERE l'arco
  async removeEdgeClosure(scenarioId, edgeId) {
    return await apiClient.post('/engine/edge/add', { 
      id: scenarioId, 
      edges: [String(edgeId)] 
    });
  }
};