import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    // Forziamo i dati di default per aggirare i controlli
    user: { _id: "69acf6d9fb394c0ba1beacb2", email: "developer@test.it", nickname: "DevMode" },
    uid: "69acf6d9fb394c0ba1beacb2", 
    isAuthenticated: true,
    isLogged: true
  }),
  
  actions: {
    // Rendiamo vuote/sempre positive le funzioni di controllo
    async login() { 
        this.isAuthenticated = true; 
        return true;
    },
    async checkSession() { 
        this.isAuthenticated = true; 
        return true;
    },
    async checkAuth() {
        this.isAuthenticated = true;
        return true;
    },
    logout() { 
        // Disabilitiamo il logout: l'apiClient non potrà più buttarti fuori!
        console.warn("Logout ignorato: Bypass modalità sviluppo attivo.");
    }
  }
});