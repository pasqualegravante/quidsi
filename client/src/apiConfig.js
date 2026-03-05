// src/apiConfig.js

/**
 * INTERRUTTORE
 * true  -> Usa i dati finti (Mocks) interni al frontend. Ottimo se il server è giù.
 * false -> Fa le chiamate HTTP reali verso il server del Backend.
 */
export const USE_MOCKS = true; 

// L'indirizzo base del server del tuo collega (chiedigli qual è!)
// Esempio: "http://localhost:8080/api" oppure "http://192.168.1.100:3000"
export const BASE_URL = "http://localhost:8080/api";

// Tutti gli endpoint centralizzati. Se il BE cambia un URL, modifichi solo qui!
export const ENDPOINTS = {
  SCENARIOS: `${BASE_URL}/scenarios`,
  SCENARIO_DETAIL: (id) => `${BASE_URL}/scenarios/${id}`,
  TOGGLE_EDGE: `${BASE_URL}/edge/toggle`,
  DIJKSTRA: `${BASE_URL}/routing/dijkstra`,
  CONNECTED_COMPONENTS: `${BASE_URL}/routing/components`,
};