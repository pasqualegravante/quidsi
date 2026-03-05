import { defineStore } from 'pinia';

export const useUiStore = defineStore('ui', {
  state: () => ({
    toasts: [],
    isCalculating: false,
    isRightSidebarOpen: false,
  }),
  actions: {
    showToast(message, type = 'info') {
      const id = Date.now() + Math.random();
      this.toasts.push({ id, message, type });
      setTimeout(() => {
        this.toasts = this.toasts.filter(t => t.id !== id);
      }, 3500);
    },
    setCalculating(status) {
      this.isCalculating = status;
    },
    setRightSidebar(isOpen) {
      this.isRightSidebarOpen = isOpen;
    }
  }
});