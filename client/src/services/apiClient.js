import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''; 

export const apiClient = {
  async request(endpoint, options = {}) {
    const authStore = useAuthStore();
    const uiStore = useUiStore();

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const config = {
      ...options,
      headers,
      credentials: 'include', 
    };

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, config);

      if (response.status === 401) {
        console.warn("Sessione scaduta o non autorizzata. Esecuzione logout forzato.");
        //authStore.logout(); 
        //uiStore.showToast("La tua sessione è scaduta. Effettua di nuovo l'accesso.", "error");
        throw new Error("Unauthorized 401");
      }

      // 🔥 FIX 1: Gestione robusta degli errori (anche se il server manda testo normale)
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Errore HTTP: ${response.status}`;
        try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorMessage;
        } catch (e) {
            errorMessage = errorText || errorMessage; // Usa il testo grezzo se non è JSON
        }
        throw new Error(errorMessage);
      }

      if (response.status === 204) return null;
      
      const text = await response.text();
      if (!text) return {};

      // 🔥 FIX 2: Previene il SyntaxError fatale su res.send("testo semplice")
      try {
        return JSON.parse(text);
      } catch (e) {
        return { message: text }; // Lo impacchettiamo in un oggetto innocuo
      }

    } catch (error) {
      console.error(`[API Client Error] su ${endpoint}:`, error.message);
      throw error; 
    }
  },

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  },
  post(endpoint, data, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body: JSON.stringify(data || {}) });
  },
  put(endpoint, data, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body: JSON.stringify(data || {}) });
  },
  delete(endpoint, data, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE', body: JSON.stringify(data || {}) });
  }
};