import { USE_MOCKS, ENDPOINTS } from '../apiConfig';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// IL NOSTRO FINTO DATABASE IN MEMORIA
let mockScenarios = [
  { id: 'scen_1', label: 'Scenario di Prova 1', description: 'Scenario base mockato', closed_segments: ['1040_1', '1040_2'], alfa: 0.5 },
  { id: 'scen_2', label: 'Scenario Centro Storico', description: 'Chiusura via Dante', closed_segments: [], alfa: 0.5 }
];

export const ScenarioService = {
  async getAllScenarios(uid) {
    if (USE_MOCKS) {
      await delay(300);
      return { scenarios: [...mockScenarios] }; // Ora restituisce il DB aggiornato
    }
    const res = await fetch(`${ENDPOINTS.SCENARIOS}?uid=${uid}`);
    if (!res.ok) throw new Error("Errore recupero scenari");
    return res.json();
  },

  async createScenario(uid) {
    if (USE_MOCKS) {
      await delay(400);
      const newScen = { id: `scen_${Date.now()}`, label: 'Nuovo Scenario', description: '', closed_segments: [], alfa: 0.5 };
      mockScenarios.push(newScen); // Salva nel finto DB
      return { scen: newScen };
    }
    const res = await fetch(ENDPOINTS.SCENARIOS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid })
    });
    return res.json();
  },

  async selectScenario(uid, scen_id) {
    if (USE_MOCKS) {
      await delay(300);
      const scenario = mockScenarios.find(s => s.id === scen_id) || mockScenarios[0];
      return { scenario };
    }
    const res = await fetch(`${ENDPOINTS.SCENARIO_DETAIL(scen_id)}?uid=${uid}`);
    return res.json();
  },

  async saveScenario(uid, scen_id) {
    if (USE_MOCKS) {
      await delay(500);
      return { saved: true };
    }
    const res = await fetch(ENDPOINTS.SCENARIO_DETAIL(scen_id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, action: 'save' })
    });
    return res.json();
  },

  async duplicateScenario(uid, scen_id) {
    if (USE_MOCKS) {
      await delay(500);
      const existing = mockScenarios.find(s => s.id === scen_id);
      const newScen = { 
        id: `scen_copy_${Date.now()}`, 
        label: existing ? `${existing.label} (Copia)` : 'Copia Scenario', 
        description: existing ? existing.description : '',
        closed_segments: existing ? [...existing.closed_segments] : [],
        alfa: existing ? existing.alfa : 0.5
      };
      mockScenarios.push(newScen); // Salva la copia nel finto DB
      return { scen: newScen };
    }
    const res = await fetch(`${ENDPOINTS.SCENARIO_DETAIL(scen_id)}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid })
    });
    return res.json();
  },

  async deleteScenario(uid, scen_id) {
    if (USE_MOCKS) {
      await delay(400);
      mockScenarios = mockScenarios.filter(s => s.id !== scen_id); // Lo rimuove dal finto DB
      return { deleted: true };
    }
    const res = await fetch(ENDPOINTS.SCENARIO_DETAIL(scen_id), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid })
    });
    return res.json();
  },

  async updateScenario(uid, scen_id, data) {
    if (USE_MOCKS) {
      await delay(300);
      const index = mockScenarios.findIndex(s => s.id === scen_id);
      if (index > -1) {
        if (data.label) mockScenarios[index].label = data.label;
        if (data.description) mockScenarios[index].description = data.description;
      }
      return { updated: true };
    }
    const res = await fetch(ENDPOINTS.SCENARIO_DETAIL(scen_id), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, ...data })
    });
    return res.json();
  }
};