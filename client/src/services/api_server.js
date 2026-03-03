/**
 * @file api.js
 * @description Service layer HTTP aggiornato per l'architettura stateful definita nel D2 Challenge.
 * Il backend mantiene lo stato del grafo, il client invia azioni e ridisegna in base alle risposte.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export const ApiService = {

  // ==========================================
  // GESTIONE SCENARI
  // ==========================================

  // 1. Crea un nuovo scenario di default [cite: 89, 90]
  async createScenario(uid) {
    const res = await fetch(`${API_BASE_URL}/scenario/new`, {
      method: 'POST', // [cite: 88, 92]
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid }) // [cite: 93, 94]
    });
    return await res.json(); // Risposta attesa: { scen: {scenario} } [cite: 96-99]
  },

  // 2. Ottieni tutti gli scenari dell'utente [cite: 118, 119]
  async getAllScenarios(uid) {
    const res = await fetch(`${API_BASE_URL}/scenario/get-all`, {
      method: 'POST', // [cite: 117]
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid }) // [cite: 121, 122]
    });
    return await res.json(); // Risposta attesa: { scenarios: [scenario] } [cite: 125-127]
  },

  // 3. Seleziona lo scenario da caricare in memoria [cite: 129, 130]
  async selectScenario(uid, scen_id) {
    const res = await fetch(`${API_BASE_URL}/scenario/select`, {
      method: 'POST', // Deducibile dal contesto e dalle altre API
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, scen_id }) // [cite: 132-134]
    });
    return await res.json(); // Risposta attesa: { scenario: {scenario} } [cite: 137-139]
  },

  // 4. Salva lo scenario attualmente attivo nel DB [cite: 141, 142]
  async saveScenario(uid, scen_id) {
    const res = await fetch(`${API_BASE_URL}/scenario/save`, {
      method: 'POST', // [cite: 280, 281]
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, scen_id }) // [cite: 144-147]
    });
    return await res.json(); // Risposta attesa: { saved: boolean } [cite: 150-152]
  },

  // 5. Duplica uno scenario esistente [cite: 103, 104]
  async duplicateScenario(uid, scenario_id) {
    const res = await fetch(`${API_BASE_URL}/scenario/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, scenario: scenario_id }) // [cite: 106-108]
    });
    return await res.json(); // Risposta attesa: { scen: {scenario} } [cite: 111-113]
  },

  // 6. Elimina lo scenario indicato [cite: 154, 155]
  async deleteScenario(uid, scen_id) {
    const res = await fetch(`${API_BASE_URL}/scenario/delete`, {
      method: 'DELETE', // [cite: 156]
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, scen_id }) // [cite: 159-161]
    });
    return await res.json(); // Risposta attesa: { deleted: boolean } [cite: 164-166]
  },

  // ==========================================
  // FUNZIONI ALGORITMICHE
  // ==========================================

  // 7. Calcola il percorso di Dijkstra [cite: 168, 169]
  async calculateDijkstra(uid, scen_id, extraPayload = {}) {
    // Il D2 indica solo uid e scen_id [cite: 171-174], ma logicamente serviranno i punti di partenza/destinazione
    const res = await fetch(`${API_BASE_URL}/scenario/djk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, scen_id, ...extraPayload })
    });
    return await res.json(); // Risposta attesa: { edges: [edge] } [cite: 177-179]
  },

  // 8. Calcola le componenti connesse [cite: 181, 182]
  async calculateConnectedComponents(uid, scen_id) {
    const res = await fetch(`${API_BASE_URL}/scenario/cc`, {
      method: 'POST', // [cite: 180]
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, scen_id }) // [cite: 184-187]
    });
    return await res.json(); // Risposta attesa: { num_of_ccs: int, ccs: [[edge]] } [cite: 190-194]
  },

  // ==========================================
  // GESTIONE ARCHI E NODI
  // ==========================================

  // 9. Elimina/riaggiunge un arco (Toggle) [cite: 198, 199]
  async toggleEdge(uid, scen_id, edgeId) {
    // Il documento non menziona l'edge nel payload [cite: 201-203], ma è logicamente necessario.
    const res = await fetch(`${API_BASE_URL}/edge/toggle`, {
      method: 'POST', // [cite: 197]
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, scen_id, edge: edgeId })
    });
    return await res.json(); // Risposta attesa: { toggled: boolean } [cite: 206-208]
  },

  // 10. Info Arco [cite: 211, 212]
  async getEdgeInfo(uid, scen_id, edge) {
    const res = await fetch(`${API_BASE_URL}/edge/get-info`, {
      method: 'POST', // [cite: 210]
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, scen_id, edge }) // [cite: 214-217]
    });
    return await res.json(); // Risposta attesa: { edge: {edge_infos} } [cite: 220-222]
  },

  // 11. Elimina/riaggiunge un nodo (Toggle) [cite: 231, 232]
  async toggleNode(uid, scen_id, nodeId) {
    // Come per gli archi, aggiungo il nodeId al payload per necessità logica
    const res = await fetch(`${API_BASE_URL}/node/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, scen_id, node: nodeId }) // [cite: 234-236]
    });
    return await res.json(); // Risposta attesa: { toggled: boolean } [cite: 239-241]
  },
  async updateScenario(uid, scen_id, data) {
    // data può contenere { label, description }
    const res = await fetch(`${API_BASE_URL}/scenario/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, scen_id, ...data })
    });
    return await res.json(); // Risposta attesa: { updated: boolean }
  },
};