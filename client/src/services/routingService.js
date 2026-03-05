import { USE_MOCKS, ENDPOINTS } from '../apiConfig';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const RoutingService = {
  async calculateDijkstra(uid, scen_id, payload) {
    if (USE_MOCKS) {
      await delay(800);
      return { edges: ['1040_1', '1041_1', '1042_1'] }; 
    }
    const res = await fetch(ENDPOINTS.DIJKSTRA, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, scenarioId: scen_id, ...payload })
    });
    return res.json();
  },

  async calculateConnectedComponents(uid, scen_id) {
    if (USE_MOCKS) {
      await delay(1000);
      return { CCS: [ ['1040_1', '1040_2'], ['1041_1', '1042_1'] ] };
    }
    const res = await fetch(ENDPOINTS.CONNECTED_COMPONENTS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, scenarioId: scen_id })
    });
    return res.json();
  }
};