import { defineStore } from 'pinia';
import { apiClient } from '../services/apiClient'; // 🔥 Usa il client reale

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isAuthenticated: !!localStorage.getItem('dss_token'),
    uid: localStorage.getItem('dss_uid') || '',
    token: localStorage.getItem('dss_token') || '',
    user: JSON.parse(localStorage.getItem('dss_user')) || null,
  }),
  actions: {
    async performLogin(email, password) {
      // 🔥 CHIAMATA REALE AL SERVER
      const res = await apiClient.post('/login', { email, password });
      
      if (res && res.token) {
        this.isAuthenticated = true;
        this.token = res.token;
        this.uid = res.user.id;
        this.user = res.user;

        localStorage.setItem('dss_token', res.token);
        localStorage.setItem('dss_uid', res.user.id);
        localStorage.setItem('dss_user', JSON.stringify(res.user));
        return true;
      }
      return false;
    },
    
    // 🔥 FUNZIONE DI LOGOUT REINSERITA
    logout() {
      // 1. Puliamo lo stato in RAM
      this.isAuthenticated = false;
      this.token = '';
      this.uid = '';
      this.user = null;
      
      // 2. Puliamo il disco del browser (così non ti fa rientrare in automatico)
      localStorage.removeItem('dss_token');
      localStorage.removeItem('dss_uid');
      localStorage.removeItem('dss_user');
      
      // 3. Ricarichiamo la pagina per buttare l'utente fuori e tornare al Login
      window.location.reload();
    }
  }
});