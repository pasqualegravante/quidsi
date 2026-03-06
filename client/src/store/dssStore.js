import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useAuthStore } from './authStore';
import { useMapStore } from './mapStore';
import { useScenarioStore } from './scenarioStore';
import { useUiStore } from './uiStore';

export const useDssStore = defineStore('dss', () => {
  const auth = useAuthStore();
  const map = useMapStore();
  const scenario = useScenarioStore();
  const ui = useUiStore();

  // PROPRIETÀ SCRIVIBILI
  const allEdges = computed({ get: () => map.allEdges, set: (val) => { map.allEdges = val; } });
  const mapFocusId = computed({ get: () => map.mapFocusId, set: (val) => { map.mapFocusId = val; } });
  const alfa = computed({ get: () => map.alfa, set: (val) => { map.alfa = val; } });
  const selectionMode = computed({ get: () => map.selectionMode, set: (val) => { map.selectionMode = val; } });
  const selectedEdges = computed({ get: () => map.selectedEdges, set: (val) => { map.selectedEdges = val; } });

  // GETTER SOLA LETTURA
  const isAuthenticated = computed(() => auth.isAuthenticated);
  const uid = computed(() => auth.uid);
  const scenarios = computed(() => scenario.scenarios);
  const activeScenario = computed(() => scenario.activeScenario);
  const isModified = computed(() => scenario.isModified);
  const activeClosureIds = computed(() => map.activeClosureIds);
  const dijkstraPath = computed(() => map.dijkstraPath);
  const connectedComponents = computed(() => map.connectedComponents);
  const routingStartPoint = computed(() => map.routingStartPoint);
  const routingEndPoint = computed(() => map.routingEndPoint);
  const isCalculating = computed(() => ui.isCalculating);
  const pendingAction = computed(() => scenario.pendingAction);
  const activeClosuresObjects = computed(() => map.activeClosuresObjects);

  // AZIONI
  async function performLogin(e, p) { return auth.performLogin(e, p); }
  function handleEdgeSelection(p) { return map.handleEdgeSelection(p); }
  function clearMapFocus() { map.clearMapFocus(); }
  function resetSelection() { map.resetSelection(); }
  
  function setSelectionMode(m) { map.selectionMode = (map.selectionMode === m ? null : m); }
  function setRoutingPoint(p) { return map.setRoutingPoint(p); }
  
  async function fetchAllScenarios() { return scenario.fetchAllScenarios(auth.uid); }
  async function selectScenario(id) { return scenario.selectScenario(id); }
  async function saveCurrentScenario() { return scenario.saveCurrentScenario(); }
  async function resolvePendingAction(s) { return scenario.resolvePendingAction(s); }
  async function createScenario() { return scenario.createScenario(); }
  async function updateScenarioInfo(id, l, d) { return scenario.updateScenarioInfo(id, l, d); }
  async function duplicateScenario(id) { return scenario.duplicateScenario(id); }
  async function deleteScenario(id) { return scenario.deleteScenario(id); }
  async function updateScenarioLabel(labeltext) {return scenario.updateScenarioLabel(labeltext);}
  

  async function calculateDijkstra() { return map.calculateDijkstra(); }
  async function calculateConnessione() { return map.calculateConnectedComponents(); }
  
  async function toggleStreetStatus(streetName, shouldClose) {
    if (!scenario.activeScenario) return;
    const success = await map.toggleStreetStatus(auth.uid, scenario.activeScenario.id, streetName, shouldClose);
    if (success) scenario.isModified = true;
  }
  async function toggleEdgeStatus(edgeId) {
    if (!scenario.activeScenario) return;
    const success = await map.toggleEdgeStatus(auth.uid, scenario.activeScenario.id, edgeId);
    if (success) scenario.isModified = true;
  }

  function processMapClick(edgePayload) {
    if (map.selectionMode) {
      map.setRoutingPoint(edgePayload);
    } else {
      map.handleEdgeSelection(edgePayload);
      ui.setRightSidebar(map.selectedEdges.length > 0);
    }
  }

  function clearMapSelection() {
    if (!map.selectionMode) {
      map.resetSelection();
      ui.setRightSidebar(false);
    }
  }

  function processSearchSelect(segmentsPayloads) {
    map.selectedEdges = segmentsPayloads;
    ui.setRightSidebar(true);
  }

  async function executeGlobalDelete() {
    const scenarioId = ui.modalData?.id;
    if (scenarioId) {
      await scenario.deleteScenario(scenarioId);
      ui.closeModal();
    }
  }

  return {
    isAuthenticated, uid, scenarios, activeScenario, isModified,
    selectedEdges, activeClosureIds, dijkstraPath, connectedComponents,
    routingStartPoint, routingEndPoint,
    allEdges, mapFocusId, alfa, selectionMode, isCalculating, pendingAction, activeClosuresObjects,
    
    performLogin, handleEdgeSelection, clearMapFocus, resetSelection, setSelectionMode, setRoutingPoint,
    fetchAllScenarios, selectScenario, saveCurrentScenario, resolvePendingAction, createScenario, updateScenarioInfo, duplicateScenario, deleteScenario,
    calculateDijkstra, calculateConnessione, toggleStreetStatus, toggleEdgeStatus,
    processMapClick, clearMapSelection, processSearchSelect, executeGlobalDelete, updateScenarioLabel
  };
});