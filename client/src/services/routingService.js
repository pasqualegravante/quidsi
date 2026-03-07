import { apiClient } from './apiClient';

export const RoutingService = {
  
  async calculateDijkstra(uid, scen_id, payload) {
    // Peschiamo il nodo UTM esatto dell'arco selezionato per evitare "NodeNotFound" in NetworkX
    const getExactNode = (pointData) => {
      if (pointData && pointData.nodes && pointData.nodes.length > 0) {
        return pointData.nodes[0]; // Ritorna l'array [x, y] in UTM
      }
      throw new Error("Punto di routing invalido (nodi mancanti)");
    };

    const requestBody = {
      uid: uid,
      scen_id: scen_id,
      source: getExactNode(payload.startPoint), // Invia un array [x, y]
      target: getExactNode(payload.endPoint)    // Invia un array [x, y]
    };

    return await apiClient.post('/scenario/djk', requestBody);
  },

  async calculateConnectedComponents(uid, scen_id) {
    return await apiClient.post('/scenario/cc', { uid, scen_id });
  }
};