import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isAuthenticated: false,
    uid: '', 
  }),
  actions: {
    async performLogin(email, password) {
      this.isAuthenticated = true;
      this.uid = "ID_UTENTE_LOGGATO_01"; 
    }
  }
});