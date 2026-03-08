import { apiClient } from './apiClient';

const formatNode = (coords) => {
  const x = Number.isInteger(coords[0]) ? coords[0].toFixed(1) : String(coords[0]);
  const y = Number.isInteger(coords[1]) ? coords[1].toFixed(1) : String(coords[1]);
  return `${x} ${y}`;
};

export const EdgeService = {
  // Rimuove dal grafo (Chiude la strada) - Chiama l'endpoint DELETE
  async closeEdge(userId, scenId, edgeNodes) {
    const nodeA = formatNode(edgeNodes[0]);
    const nodeB = formatNode(edgeNodes[1]);
    
    return await apiClient.delete('/engine/edge/delete', { 
      user_id: userId,
      _id: scenId, 
      edges: [[nodeA, nodeB]] 
    });
  },

  // Aggiunge al grafo (Riapre la strada) - Chiama l'endpoint POST
  async openEdge(userId, scenId, edgeNodes) {
    const nodeA = formatNode(edgeNodes[0]);
    const nodeB = formatNode(edgeNodes[1]);
    
    return await apiClient.post('/engine/edge/add', { 
      user_id: userId,
      _id: scenId, 
      edges: [[nodeA, nodeB]] 
    });
  }
};