/**
 * @file api.js (VERSIONE MOCK PER TEST SENZA SERVER)
 * Simula i ritardi di rete e restituisce i payload previsti dal D2 Challenge.
 */

// Funzione helper per simulare il tempo di risposta del server (es. 500ms)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const ApiService = {

  async createScenario(uid) {
    await delay(500);
    console.log(`[MOCK API] POST /scenario/new per uid: ${uid}`);
    return { scen: { id: 'scen_nuovo_123', label: 'Nuovo Scenario', closed_segments: [] } };
  },

  async getAllScenarios(uid) {
    await delay(300);
    console.log(`[MOCK API] POST /scenario/get-all per uid: ${uid}`);
    return {
      scenarios: [
        { id: 'scen_1', label: 'Scenario Giorno', closed_segments: ['1040_1', '1050_2'] },
        { id: 'scen_2', label: 'Scenario Notte', closed_segments: [] }
      ]
    };
  },

  async selectScenario(uid, scen_id) {
    await delay(400);
    console.log(`[MOCK API] POST /scenario/select -> ${scen_id}`);
    return {
      scenario: {
        id: scen_id,
        label: 'Scenario Selezionato',
        closed_segments: ['1040_1'] // Simuliamo che ci sia un arco chiuso
      }
    };
  },

  async saveScenario(uid, scen_id) {
    await delay(600);
    console.log(`[MOCK API] POST /scenario/save -> ${scen_id}`);
    return { saved: true };
  },

  async toggleEdge(uid, scen_id, edgeId) {
    await delay(300);
    console.log(`[MOCK API] POST /edge/toggle -> chiudo/riapro l'arco ${edgeId}`);
    return { toggled: true }; // Dice allo store che l'azione è andata a buon fine
  },

  async calculateDijkstra(uid, scen_id, extraPayload) {
    await delay(800);
    console.log(`[MOCK API] POST /scenario/djk -> Calcolo Dijkstra`);
    // Simuliamo la restituzione di un percorso (inserisci ID di archi reali del tuo GeoJSON)
    return { edges: ['1040_1', '1041_1', '1042_1'] };
  },

  async calculateConnectedComponents(uid, scen_id) {
    await delay(1000);
    console.log(`[MOCK API] POST /scenario/cc -> Calcolo componenti connesse`);
    // Restituisce un array di componenti connesse (ognuna è un array di archi)
    return {
      num_of_ccs: 2,
      CCS: [
        ['1040_1', '1041_1'], // Area isolata 1
        ['1090_1']            // Area isolata 2
      ]
    };
  },
  async updateScenario(uid, scen_id, payload) {
    await delay(400);
    console.log(`[MOCK API] POST /scenario/update -> ${scen_id}`, payload);
    return { updated: true };
  },
};