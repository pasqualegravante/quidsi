/**
 * @file storage.js
 * @description Layer di astrazione per la persistenza locale (Service Pattern).
 * Protegge l'applicazione da parsing JSON corrotti.
 */

export const StorageService = {
  getWeights() {
    try {
      const data = localStorage.getItem('quidsi_algorithm_weights');
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.warn("StorageService: Fallback pesi di default.");
      return {};
    }
  },

  getClosures() {
    try {
      const data = localStorage.getItem('dss_local_closures');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn("StorageService: Fallback cache chiusure vuota.");
      return [];
    }
  },

  saveClosures(ids) {
    localStorage.setItem('dss_local_closures', JSON.stringify(ids));
  },

  clearClosures() {
    localStorage.removeItem('dss_local_closures');
  }
};