import { defineStore } from 'pinia';

export const useUiStore = defineStore('ui', {
  state: () => ({
    isCalculating: false,
    loadingMessage: 'Elaborazione in corso...',
    isRightSidebarOpen: false,
    mapSnapshot: null,
    activeModal: null,
    modalData: null,
    
    // 🔥 NUOVI STATI PER LA SIDEBAR SINISTRA
    activeLeftTab: 'funzioni',
    isLeftSidebarCollapsed: false 
  }),
  actions: {
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
    },

    // 🔥 NUOVE AZIONI PER COMANDARE LA SIDEBAR A DISTANZA
    setActiveTab(tabName) {
      this.activeLeftTab = tabName;
    },
    setLeftSidebar(isOpen) {
      this.isLeftSidebarCollapsed = !isOpen; // Se isOpen è true, collapsed è false
    }
  }
});