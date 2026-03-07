import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''; // Usa path relativo o variabile d'ambiente

export const apiClient = {
  async request(endpoint, options = {}) {
    const authStore = useAuthStore();
    const uiStore = useUiStore();

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // RIMOSSA l'iniezione del Bearer token. 
    // Il browser gestirà il token JWT tramite Cookie HttpOnly automaticamente
    // grazie a credentials: 'include'.

    const config = {
      ...options,
      headers,
      credentials: 'include', // Fondamentale per inviare i Cookie HttpOnly al server
    };

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, config);

      if (response.status === 401) {
        console.warn("Sessione scaduta o non autorizzata. Esecuzione logout forzato.");
        authStore.logout(); 
        uiStore.showToast("La tua sessione è scaduta. Effettua di nuovo l'accesso.", "error");
        throw new Error("Unauthorized 401");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Errore HTTP: ${response.status}`);
      }

      // Gestione del NoContent
      if (response.status === 204) return null;
      
      // Il login restituisce body vuoto secondo le specifiche, gestiamolo
      const text = await response.text();
      return text ? JSON.parse(text) : {};

    } catch (error) {
      console.error(`[API Client Error] su ${endpoint}:`, error.message);
      throw error; 
    }
  },

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  },
  post(endpoint, data, options = {}) {
    // Se data è undefined, passa un body vuoto per evitare errori di parsing sul server
    return this.request(endpoint, { ...options, method: 'POST', body: JSON.stringify(data || {}) });
  },
  put(endpoint, data, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body: JSON.stringify(data || {}) });
  },
  delete(endpoint, data, options = {}) {
    // Aggiunto data anche per la delete, in quanto alcune api (es /scenario/delete)
    // richiedono il payload nel body.
    return this.request(endpoint, { ...options, method: 'DELETE', body: JSON.stringify(data || {}) });
  }
};