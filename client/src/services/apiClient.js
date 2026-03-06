import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';

// URL base del backend (letto dal file .env di Vite, o fallback su un path locale)
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const apiClient = {
  /**
   * Metodo principale che avvolge la fetch nativa
   */
  async request(endpoint, options = {}) {
    const authStore = useAuthStore();
    const uiStore = useUiStore();

    // 1. Configurazione automatica degli Headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // 2. Iniezione automatica del Token (se l'utente è loggato)
    if (authStore.token) {
      headers['Authorization'] = `Bearer ${authStore.token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      // Esegue la chiamata reale al backend
      const response = await fetch(`${BASE_URL}${endpoint}`, config);

      // 3. INTERCETTATORE GLOBALE: Controllo Sessione Scaduta (401)
      if (response.status === 401) {
        console.warn("Sessione scaduta o non autorizzata. Esecuzione logout forzato.");
        
        // Slogga l'utente, pulisce lo store e lo rimanda al login
        authStore.logout(); 
        uiStore.showToast("La tua sessione è scaduta. Effettua di nuovo l'accesso.", "error");
        
        throw new Error("Unauthorized 401");
      }

      // 4. Gestione degli altri errori HTTP (500, 404, 400)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Errore HTTP: ${response.status}`);
      }

      // 5. Ritorna i dati puliti (se non è una risposta vuota come un 204 No Content)
      if (response.status === 204) return null;
      return await response.json();

    } catch (error) {
      // Log centralizzato per tutti gli errori di rete (es. server irraggiungibile)
      console.error(`[API Client Error] su ${endpoint}:`, error.message);
      throw error; // Rilancia l'errore per farlo gestire al try/catch dello store (che spegnerà il loader)
    }
  },

  // Metodi Helper per comodità d'uso
  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  },
  post(endpoint, data, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body: JSON.stringify(data) });
  },
  put(endpoint, data, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body: JSON.stringify(data) });
  },
  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
};