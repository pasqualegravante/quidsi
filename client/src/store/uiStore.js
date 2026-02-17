/**
 * @file uiStore.js
 * @description Gestione dello stato globale della User Interface.
 * Evita di ingolfare App.vue con array di notifiche e flag visivi.
 */
import { reactive } from 'vue';

export const uiStore = reactive({
  toasts: [],
  isCalculating: false,
  
  showToast(message, type = 'info') {
    const id = Date.now() + Math.random();
    this.toasts.push({ id, message, type });
    setTimeout(() => {
      this.toasts = this.toasts.filter(t => t.id !== id);
    }, 3500);
  },

  setCalculating(status) {
    this.isCalculating = status;
  }
});