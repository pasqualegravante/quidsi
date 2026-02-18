import { uiStore } from '../store/uiStore'; // Importa lo store per i toast

export const StorageService = {
  getClosures() {
    try {
      const data = localStorage.getItem('dss_active_closures');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Errore lettura storage:", e);
      return [];
    }
  },

  saveClosures(closuresArray) {
    try {
      localStorage.setItem('dss_active_closures', JSON.stringify(closuresArray));
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        console.error("Memoria browser piena!");
        uiStore.showToast("Memoria del browser piena! Impossibile salvare la modifica.", "error");
      }
    }
  },

  clearClosures() {
    localStorage.removeItem('dss_active_closures');
  },

  getWeights() {
    try {
      const w = localStorage.getItem('dss_weights');
      return w ? JSON.parse(w) : {};
    } catch (e) {
      return {};
    }
  }
};