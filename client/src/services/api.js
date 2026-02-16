/**
 * @file api.js
 * @description Service layer per le chiamate HTTP. 
 * Centralizza le comunicazioni verso il backend Node.js/Python.
 */

const API_BASE_URL = 'http://localhost:3000/api';

export const ApiService = {
  /**
   * Invia i dati al backend per il calcolo del percorso ottimo.
   * @param {Object} payload { start_id, end_id, closed_edges, weights }
   */
  async calculateRoute(payload) {
    try {
      const response = await fetch(`${API_BASE_URL}/dijkstra`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) throw new Error('Errore nella risposta del server');
      return await response.json();
    } catch (error) {
      console.error("ApiService - Route Error:", error);
      throw error;
    }
  },

  /**
   * (Stub per futuro) Salvataggio dello scenario corrente
   */
  async saveScenario(name, closedEdges) {
    console.log(`ApiService: Richiesta salvataggio scenario ${name}`, closedEdges);
    // Qui andrà la fetch POST verso /api/scenarios
    return { success: true };
  }
};