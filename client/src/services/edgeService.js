import { USE_MOCKS, ENDPOINTS } from '../apiConfig';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const EdgeService = {
  async toggleEdge(uid, scen_id, edgeId) {
    if (USE_MOCKS) {
      await delay(100); 
      return { toggled: true };
    }
    const res = await fetch(ENDPOINTS.TOGGLE_EDGE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, scenarioId: scen_id, edgeId: String(edgeId) })
    });
    return res.json();
  }
};