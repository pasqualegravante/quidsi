/**
 * @file api_server.js
 * @description Service layer HTTP aggiornato per l'architettura stateful definita nel D2 Challenge.
 * Il backend mantiene lo stato del grafo, il client invia azioni e ridisegna in base alle risposte.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

/**
 * Helper per centralizzare le chiamate fetch.
 * Invia automaticamente le credenziali (cookie JWT) e imposta gli header corretti.
 */
const fetchAPI = async (endpoint, payload, method = 'POST') => {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // FONDAMENTALE PER L'AUTENTICAZIONE JWT
    body: JSON.stringify(payload)
  });
  
  if (!res.ok) {
    console.error(`Errore API [${method} ${endpoint}]: Status ${res.status}`);
    // A seconda di come gestite gli errori, potresti voler lanciare un'eccezione qui
  }
  
  return await res.json();
};

export const ApiService = {

  // ==========================================
  // GESTIONE SCENARI
  // ==========================================

  // 1. Crea un nuovo scenario di default
  async createScenario(uid) {
    return await fetchAPI('/scenario/new', { uid });
  },

  // 2. Ottieni tutti gli scenari dell'utente
  async getAllScenarios(uid) {
    return await fetchAPI('/scenario/get-all', { uid });
  },

  // 3. Seleziona lo scenario da caricare in memoria
  async selectScenario(uid, scen_id) {
    return await fetchAPI('/scenario/select', { uid, scen_id });
  },

  // 4. Salva lo scenario attualmente attivo nel DB
  async saveScenario(uid, scen_id) {
    return await fetchAPI('/scenario/save', { uid, scen_id });
  },

  // 5. Duplica uno scenario esistente
  async duplicateScenario(uid, scenario_id) {
    return await fetchAPI('/scenario/duplicate', { uid, scenario: scenario_id });
  },

  // 6. Elimina lo scenario indicato
  async deleteScenario(uid, scen_id) {
    // D2 specifica il metodo DELETE per questo endpoint
    return await fetchAPI('/scenario/delete', { uid, scen_id }, 'DELETE');
  },

  // Estensione D2: Aggiorna label e descrizione dello scenario
  async updateScenario(uid, scen_id, data) {
    // data può contenere { label, description }
    return await fetchAPI('/scenario/update', { uid, scen_id, ...data });
  },

  // ==========================================
  // FUNZIONI ALGORITMICHE
  // ==========================================

  // 7. Calcola il percorso di Dijkstra
  async calculateDijkstra(uid, scen_id, extraPayload = {}) {
    return await fetchAPI('/scenario/djk', { uid, scen_id, ...extraPayload });
  },

  // 8. Calcola le componenti connesse
  async calculateConnectedComponents(uid, scen_id) {
    return await fetchAPI('/scenario/cc', { uid, scen_id });
  },

  // ==========================================
  // GESTIONE ARCHI E NODI
  // ==========================================

  // 9. Elimina/riaggiunge un arco (Toggle)
  async toggleEdge(uid, scen_id, edgeId) {
    return await fetchAPI('/edge/toggle', { uid, scen_id, edge: edgeId });
  },

  // 10. Info Arco
  async getEdgeInfo(uid, scen_id, edgeId) {
    return await fetchAPI('/edge/get-info', { uid, scen_id, edge: edgeId });
  },

  // 11. Elimina/riaggiunge un nodo (Toggle)
  async toggleNode(uid, scen_id, nodeId) {
    return await fetchAPI('/node/toggle', { uid, scen_id, node: nodeId });
  }
};