import { apiClient } from './apiClient';

export const EdgeService = {
  // POST /edge/toggle
  async toggleEdge(uid, scen_id, edgeNodes) {
    return await apiClient.post('/edge/toggle', { 
      uid: uid, 
      scen_id: scen_id, 
      edge: edgeNodes // Invia array [[x1,y1], [x2,y2]]
    });
  }
};