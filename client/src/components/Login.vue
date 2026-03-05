<template>
  <div class="login-container">
    <div class="login-card">
      <div class="brand">
        <span class="brand-quidsi">QuidSi</span>
      </div>
      <h2 class="login-title">Accesso Operatore</h2>
      
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="input-group">
          <label for="email">Email</label>
          <input 
            type="email" 
            id="email" 
            v-model="email" 
            placeholder="operatore@quidsi.it" 
            required 
          />
        </div>
        
        <div class="input-group">
          <label for="password">Password</label>
          <input 
            type="password" 
            id="password" 
            v-model="password" 
            placeholder="Inserisci la password" 
            required 
          />
        </div>

        <div v-if="errorMessage" class="error-msg">
          {{ errorMessage }}
        </div>

        <button type="submit" class="btn-login" :disabled="isLoading">
          {{ isLoading ? 'Accesso in corso...' : 'ENTRA' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script>
import { useDssStore } from '../store/dssStore';

export default {
  name: 'Login',
  data() {
    return {
      email: '',
      password: '',
      errorMessage: '',
      isLoading: false
    };
  },
  setup() {
    const dssStore = useDssStore();
    return { dssStore };
  },
  methods: {
    async handleLogin() {
      this.isLoading = true;
      this.errorMessage = '';
      try {
        await this.dssStore.performLogin(this.email, this.password);
      } catch (error) {
        // STAMPIAMO L'ERRORE VERO IN CONSOLE E A SCHERMO
        console.error("Dettaglio Errore bloccante:", error);
        this.errorMessage = `Errore tecnico: ${error.message}`;
      } finally {
        this.isLoading = false;
      }
    }
  }
}
</script>

<style scoped>
.login-container { display: flex; justify-content: center; align-items: center; height: 100vh; background: #e2e8f0; width: 100vw; }
.login-card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); width: 100%; max-width: 400px; text-align: center; border-top: 5px solid #0f172a; }
.brand { margin-bottom: 20px; background: #0f172a; padding: 15px; border-radius: 8px; }
.brand-quidsi { color: #facc15; font-weight: 900; font-size: 32px; letter-spacing: 1px; }
.login-title { font-size: 18px; color: #334155; margin-bottom: 30px; }
.login-form { display: flex; flex-direction: column; gap: 20px; text-align: left; }
.input-group label { display: block; font-size: 13px; font-weight: bold; color: #475569; margin-bottom: 8px; }
.input-group input { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-family: 'Inter', sans-serif; }
.input-group input:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
.error-msg { color: #ef4444; font-size: 13px; font-weight: bold; text-align: center; }
.btn-login { background: #2563eb; color: white; border: none; padding: 14px; border-radius: 6px; font-weight: bold; font-size: 16px; cursor: pointer; transition: 0.2s; margin-top: 10px; }
.btn-login:hover:not(:disabled) { background: #1d4ed8; }
.btn-login:disabled { opacity: 0.7; cursor: not-allowed; }
</style>