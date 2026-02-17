/**
 * @file api.js
 * @description Service layer HTTP con DTO Validation e HTTP Error Translation
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

/**
 * Data Transfer Object Builder (Sanitizzazione Payload)
 * Evita di far crashare il backend Python con dati sporchi o undefined
 */
function buildRouteDTO(payload) {
  const start = String(payload.start_id || '').trim();
  const end = String(payload.end_id || '').trim();
  
  if (!start || start === 'undefined' || start === 'null') throw new Error('VALIDATION_ERROR');
  if (!end || end === 'undefined' || end === 'null') throw new Error('VALIDATION_ERROR');
  if (start === end) throw new Error('VALIDATION_ERROR_SAME_NODE');

  return {
    start_id: start,
    end_id: end,
    // Pulisce l'array eliminando eventuali null e forzando tutto a Stringa
    closed_edges: Array.isArray(payload.closed_edges) 
      ? payload.closed_edges.filter(id => id != null).map(String) 
      : [],
    weights: payload.weights || {}
  };
}

export const ApiService = {
  async calculateRoute(rawPayload, signal = null) {
    try {
      // 1. DTO Validation: se fallisce, blocca tutto qui.
      const safePayload = buildRouteDTO(rawPayload);

      const response = await fetch(`${API_BASE_URL}/dijkstra`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(safePayload),
        signal
      });
      
      // 2. HTTP Error Translation
      if (!response.ok) {
        if (response.status === 404) throw new Error('NOT_FOUND'); // Nodo isolato
        if (response.status === 400) throw new Error('BAD_REQUEST'); // Dati malformati
        if (response.status === 500) throw new Error('SERVER_ERROR'); // Python crash
        throw new Error('GENERIC_ERROR');
      }
      
      return await response.json();

    } catch (error) {
      if (error.name === 'AbortError') throw new Error('ABORTED');
      console.error("ApiService Error:", error);
      throw error; // Rilanciamo il codice stringa (es. 'NOT_FOUND') ad App.vue
    }
  },

  async saveScenario(name, closedEdges) {
    return { success: true };
  }
};