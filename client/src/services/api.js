/**
 * @file api.js
 * @description Service layer HTTP aggiornato per l'architettura stateful basata su uid e gid.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/engine/graph';

export const ApiService = {
  // 1. Calcolo Percorso
  async calculateRoute(uid, gid, pointList, signal = null) {
    const res = await fetch(`${API_BASE_URL}/dijkstra`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, gid, point_list: pointList }),
      signal
    });
    if (!res.ok) throw new Error(res.status === 404 ? 'NOT_FOUND' : 'GENERIC_ERROR');
    return await res.json();
  },

  // 2. Crea Nuovo Grafo (Inizializzazione)
  async createGraph(uid) {
    const res = await fetch(`${API_BASE_URL}/new`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid })
    });
    return await res.json();
  },

  // 3. Elimina Grafo (Cancellazione Scenario)
  async deleteGraph(uid, gid) {
    const res = await fetch(`${API_BASE_URL}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, gid })
    });
    return await res.json();
  },

  // 4. Seleziona/Carica Grafo (Caricamento Scenario)
  async selectGraph(uid, gid) {
    const res = await fetch(`${API_BASE_URL}/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, gid })
    });
    return await res.json();
  },

  // 5. Duplica Grafo (Creazione di una copia di lavoro)
  async duplicateGraph(uid, gid) {
    const res = await fetch(`${API_BASE_URL}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, gid })
    });
    return await res.json();
  },

  // 6. Elimina Arco (Chiusura Cantiere)
  async deleteEdge(uid, gid, pointList) {
    const res = await fetch(`${API_BASE_URL}/edge/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, gid, point_list: pointList })
    });
    return await res.json();
  },

  // 7. Info Arco
  async getEdgeInfo(uid, gid, pointList, attr = 'desvia') {
    const res = await fetch(`${API_BASE_URL}/edge/getinfo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, gid, point_list: pointList, attr })
    });
    return await res.json();
  }
};