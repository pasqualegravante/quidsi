import { defineStore } from 'pinia';

export const useUiStore = defineStore('ui', {
  state: () => ({
    isCalculating: false,
    loadingMessage: 'Elaborazione in corso...', // NUOVO STATO
    isRightSidebarOpen: false,
    mapSnapshot: null,
    activeModal: null,
    modalData: null
  }),
  actions: {
    // Ora accetta il messaggio come secondo parametro opzionale!
    setCalculating(status, message = 'Elaborazione in corso...') {
      this.isCalculating = status;
      if (status) {
        this.loadingMessage = message;
      }
    },
    setRightSidebar(status) { this.isRightSidebarOpen = status; },
    setMapSnapshot(data) { this.mapSnapshot = data; },
    openModal(modalName, data = null) {
      this.activeModal = modalName;
      this.modalData = data;
    },
    closeModal() {
      this.activeModal = null;
      this.modalData = null;
    },
    showToast(message, type = 'info') {
      alert(`[${type.toUpperCase()}] ${message}`); 
    }
  }
});