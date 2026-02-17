/**
 * @file api.js
 * @description Service layer per le chiamate HTTP. 
 * Centralizza le comunicazioni verso il backend Node.js/Python.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export const ApiService = {
  /**
   * Invia i dati al backend per il calcolo del percorso.
   * @param {Object} payload 
   * @param {AbortSignal} signal - Segnale per annullare la richiesta in volo
   */
  async calculateRoute(payload, signal = null) {
    try {
      const response = await fetch(`${API_BASE_URL}/dijkstra`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: signal // <-- Passiamo il controller di interruzione
      });
      
      if (!response.ok) throw new Error('Errore nella risposta del server');
      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn("ApiService: Richiesta terminata volontariamente (Timeout o Utente).");
      } else {
        console.error("ApiService - Route Error:", error);
      }
      throw error; // Rilanciamo l'errore per gestirlo nella UI
    }
  },

  async saveScenario(name, closedEdges) {
    console.log(`ApiService: Richiesta salvataggio scenario ${name}`, closedEdges);
    return { success: true };
  }
};