import { apiClient } from './apiClient';

const formatNode = (coords) => {
  const x = Number.isInteger(coords[0]) ? coords[0].toFixed(1) : String(coords[0]);
  const y = Number.isInteger(coords[1]) ? coords[1].toFixed(1) : String(coords[1]);
  return `${x} ${y}`;
};

export const EdgeService = {
  async toggleEdge(userId, scenId, edgeNodes) {
    const nodeA = formatNode(edgeNodes[0]);
    const nodeB = formatNode(edgeNodes[1]);
    
    return await apiClient.post('/engine/edge/toggle', { 
      user_id: userId,
      _id: scenId, 
      edges: [[nodeA, nodeB]] 
    });
  }
};