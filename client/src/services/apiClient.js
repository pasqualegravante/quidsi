import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';

// 🔥 FIX: Il fallback ora punta correttamente a Node sulla 4000
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export const apiClient = {
  async request(endpoint, options = {}) {
    const authStore = useAuthStore();
    const uiStore = useUiStore();

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (authStore.token) {
      headers['Authorization'] = `Bearer ${authStore.token}`;
    }

    const config = {
      ...options,
      headers,
      credentials: 'include',
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

      if (response.status === 204) return null;
      return await response.json();

    } catch (error) {
      console.error(`[API Client Error] su ${endpoint}:`, error.message);
      throw error; 
    }
  },

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