import { useUiStore } from '../store/uiStore';

export const StorageService = {
  getClosures() {
    try {
      const data = localStorage.getItem('dss_active_closures');
      return data ? JSON.parse(data) : [];
    } catch (e) { return []; }
  },

  saveClosures(closuresArray) {
    try {
      localStorage.setItem('dss_active_closures', JSON.stringify(closuresArray));
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        const uiStore = useUiStore(); // <-- Istanzia qui dentro
        uiStore.showToast("Memoria del browser piena! Impossibile salvare.", "error");
      }
    }
  },

  clearClosures() { localStorage.removeItem('dss_active_closures'); },

  getWeights() {
    try {
      const w = localStorage.getItem('dss_weights');
      return w ? JSON.parse(w) : {};
    } catch (e) { return {}; }
  },

  // --- NUOVO: Memoria Spaziale della Mappa ---
  getMapState() {
    try {
      const state = localStorage.getItem('dss_map_state');
      return state ? JSON.parse(state) : null;
    } catch (e) { return null; }
  },

  saveMapState(state) {
    try {
      // state è un oggetto { lat, lng, zoom }
      localStorage.setItem('dss_map_state', JSON.stringify(state));
    } catch (e) { /* Ignoriamo l'errore qui, la posizione non è un dato vitale */ }
  }
};