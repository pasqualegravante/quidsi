import { apiClient } from './apiClient';

const formatNode = (coords) => {
  const x = Number.isInteger(coords[0]) ? coords[0].toFixed(1) : String(coords[0]);
  const y = Number.isInteger(coords[1]) ? coords[1].toFixed(1) : String(coords[1]);
  return `${x} ${y}`;
};

export const RoutingService = {
  async calculateDijkstra(userId, scenId, payload) {
    const getExactNode = (pointData) => {
      if (pointData && pointData.nodes && pointData.nodes.length > 0) return pointData.nodes[0];
      throw new Error("Punto invalido");
    };

    // 🔥 FIX: Allineato a dijkstra_req (aggiunto alfa che veniva ignorato!)
    const requestBody = {
      user_id: userId,
      _id: scenId,
      source: formatNode(getExactNode(payload.startPoint)),
      target: formatNode(getExactNode(payload.endPoint)),
      alfa: payload.alfa // Ora il motore Python userà il peso corretto
    };

    return await apiClient.post('/engine/compute/dijkstra', requestBody);
  },

  async calculateConnectedComponents(userId, scenId) {
    // Allineato a scenario_req base
    return await apiClient.post('/engine/compute/cc', { user_id: userId, _id: scenId });
  }
};