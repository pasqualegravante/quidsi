// src/services/api_server.js
import { USE_MOCKS, ENDPOINTS } from '../apiConfig';

// Funzione helper per simulare il ritardo di rete (solo per i mock)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const ApiService = {
  
  // 1. GET ALL SCENARIOS
  async getAllScenarios(uid) {
    if (USE_MOCKS) {
      await delay(300);
      return {
        scenarios: [
          { id: 'scen_1', label: 'Scenario di Prova 1', description: 'Scenario base mockato' },
          { id: 'scen_2', label: 'Scenario Centro Storico', description: 'Chiusura via Dante' }
        ]
      };
    }
    // CHIAMATA REALE
    const res = await fetch(`${ENDPOINTS.SCENARIOS}?uid=${uid}`);
    if (!res.ok) throw new Error("Errore recupero scenari");
    return res.json();
  },

  // 2. CREATE SCENARIO
  async createScenario(uid) {
    if (USE_MOCKS) {
      await delay(400);
      return { scen: { id: `scen_${Date.now()}`, label: 'Nuovo Scenario', description: '' } };
    }
    // CHIAMATA REALE
    const res = await fetch(ENDPOINTS.SCENARIOS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid })
    });
    return res.json();
  },

  // 3. SELECT SCENARIO (Carica i dettagli e le chiusure)
  async selectScenario(uid, scen_id) {
    if (USE_MOCKS) {
      await delay(300);
      return { 
        scenario: { 
          id: scen_id, 
          label: 'Scenario ' + scen_id, 
          closed_segments: ['1040_1', '1040_2'], // Qualche strada chiusa finta
          alfa: 0.5 
        } 
      };
    }
    // CHIAMATA REALE
    const res = await fetch(`${ENDPOINTS.SCENARIO_DETAIL(scen_id)}?uid=${uid}`);
    return res.json();
  },

  // 4. SAVE SCENARIO
  async saveScenario(uid, scen_id) {
    if (USE_MOCKS) {
      await delay(500);
      return { saved: true };
    }
    // CHIAMATA REALE (Es. PATCH o PUT per aggiornare lo stato)
    const res = await fetch(ENDPOINTS.SCENARIO_DETAIL(scen_id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, action: 'save' })
    });
    return res.json();
  },

  // 5. DUPLICATE SCENARIO
  async duplicateScenario(uid, scen_id) {
    if (USE_MOCKS) {
      await delay(500);
      return { scen: { id: `scen_copy_${Date.now()}` } };
    }
    // CHIAMATA REALE
    const res = await fetch(`${ENDPOINTS.SCENARIO_DETAIL(scen_id)}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid })
    });
    return res.json();
  },

  // 6. DELETE SCENARIO
  async deleteScenario(uid, scen_id) {
    if (USE_MOCKS) {
      await delay(400);
      return { deleted: true };
    }
    // CHIAMATA REALE
    const res = await fetch(ENDPOINTS.SCENARIO_DETAIL(scen_id), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid })
    });
    return res.json();
  },

  // 7. UPDATE SCENARIO INFO (Nome e descrizione)
  async updateScenario(uid, scen_id, data) {
    if (USE_MOCKS) {
      await delay(300);
      return { updated: true };
    }
    // CHIAMATA REALE
    const res = await fetch(ENDPOINTS.SCENARIO_DETAIL(scen_id), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, ...data })
    });
    return res.json();
  },

  // 8. TOGGLE EDGE (Apre/Chiude una strada)
  async toggleEdge(uid, scen_id, edgeId) {
    if (USE_MOCKS) {
      await delay(100); // Veloce per non far laggare i click continui
      return { toggled: true };
    }
    // CHIAMATA REALE
    const res = await fetch(ENDPOINTS.TOGGLE_EDGE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, scenarioId: scen_id, edgeId: String(edgeId) })
    });
    return res.json();
  },

  // 9. CALCULATE DIJKSTRA
  async calculateDijkstra(uid, scen_id, payload) {
    if (USE_MOCKS) {
      await delay(800);
      // Ritorna un percorso finto basato su ID che probabilmente hai in mappa
      return { edges: ['1040_1', '1041_1', '1042_1'] }; 
    }
    // CHIAMATA REALE
    const res = await fetch(ENDPOINTS.DIJKSTRA, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, scenarioId: scen_id, ...payload })
    });
    return res.json();
  },

  // 10. CALCULATE CONNECTED COMPONENTS
  async calculateConnectedComponents(uid, scen_id) {
    if (USE_MOCKS) {
      await delay(1000);
      return { CCS: [ ['1040_1', '1040_2'], ['1041_1', '1042_1'] ] };
    }
    // CHIAMATA REALE
    const res = await fetch(ENDPOINTS.CONNECTED_COMPONENTS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, scenarioId: scen_id })
    });
    return res.json();
  }
};