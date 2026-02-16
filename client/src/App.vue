<template>
  <div id="app" class="dss-main-container">

    <div class="toast-container">
      <transition-group name="toast-anim">
        <div v-for="toast in toasts" :key="toast.id" :class="['toast', `toast-${toast.type}`]">
          {{ toast.message }}
        </div>
      </transition-group>
    </div>

    <header class="dss-header">
      <div class="brand">
        <span class="brand-bold">QUIDSI</span>
        <span class="brand-separator">|</span>
        <span class="brand-sub">TRENTO DSS</span>
      </div>

      <div class="header-search-wrapper">
        <div class="search-input-group">
          <input type="text" v-model="searchQuery" placeholder="🔍 Cerca toponimo o ID (es. Piazza Duomo)..."
            @input="handleSearch" />
          <ul v-if="searchResults.length" class="search-dropdown">
            <li v-for="res in searchResults" :key="res.id" @click="selectRoad(res.id)">
              <span class="res-street">{{ res.street }}</span>
              <span class="res-id">ID: {{ res.id }}</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="header-actions">
        <button class="btn-reset-global" @click="softReset">↺ RESET SCENARIO</button>
        <button class="btn-system" @click="ui.fullScreenOpen = true">GESTIONE SISTEMA</button>
      </div>
    </header>

    <main class="dss-viewport">
      <MapGraph ref="mapGraph" @select-edge="handleEdgeSelect" @graph-loaded="handleGraphLoaded" />

      <MapLegend />

      <RoutingWidget :startPoint="routing.startPoint" :endPoint="routing.endPoint" :activeMode="routing.activeMode"
        @toggle-mode="toggleRoutingMode" @calculate="executeDijkstra" />
    </main>

    <Sidebar :isOpen="ui.panelOpen" :selectedEdge="selectedEdge" @close="closeSidebar"
      @simulate-portion="runSimulation('portion')" @simulate-entire="runSimulation('entire')" />

    <FullscreenMenu :isOpen="ui.fullScreenOpen" @close="ui.fullScreenOpen = false" @load-scenario="handleLoadScenario"
      @save-request="handleSaveScenario" />
  </div>
</template>

<script>
/**
 * @file App.vue
 * @description Orchestratore centrale del Decision Support System.
 * Coordina lo stato della rete stradale, l'autenticazione e la persistenza dei progetti.
 */
import MapGraph from './components/MapGraph.vue';
import Sidebar from './components/Sidebar.vue';
import FullscreenMenu from './components/FullscreenMenu.vue';
import RoutingWidget from './components/RoutingWidget.vue';
import MapLegend from './components/MapLegend.vue';

export default {
  name: 'App',
  components: { MapGraph, Sidebar, FullscreenMenu, RoutingWidget, MapLegend },
  data() {
    return {
      selectedEdge: null,
      roadList: [],
      searchQuery: '',
      searchResults: [],
      searchTimeout: null,
      ui: { panelOpen: false, fullScreenOpen: false },
      toasts: [],
      routing: { startPoint: null, endPoint: null, activeMode: null },
      hasActiveRoute: false
    };
  },
  methods: {
    /** Feedback visivo tramite Toast */
    showToast(message, type = 'info') {
      const id = Date.now() + Math.random();
      this.toasts.push({ id, message, type });
      setTimeout(() => { this.toasts = this.toasts.filter(t => t.id !== id); }, 3500);
    },

    /** Ricerca debounced nel grafo caricato */
    handleSearch() {
      clearTimeout(this.searchTimeout);
      if (this.searchQuery.length < 2) { this.searchResults = []; return; }
      this.searchTimeout = setTimeout(() => {
        const q = this.searchQuery.toLowerCase();
        const finalResults = []; const savedIds = [];
        for (const road of this.roadList) {
          const streetStr = road.street ? String(road.street).toLowerCase() : '';
          if (streetStr.includes(q) || String(road.id).includes(q)) {
            if (!savedIds.includes(road.id)) { savedIds.push(road.id); finalResults.push(road); }
          }
          if (finalResults.length >= 8) break;
        }
        this.searchResults = finalResults;
      }, 200);
    },

    selectRoad(id) {
      this.$refs.mapGraph.zoomToEdgeGroup(String(id));
      this.searchQuery = ''; this.searchResults = [];
    },

    handleGraphLoaded(list) { this.roadList = list; },

    /** Gestione click sulla mappa: Smista tra Routing e Ispezione */
    handleEdgeSelect(edge) {
      if (this.routing.activeMode) {
        const mode = this.routing.activeMode;
        if (mode === 'start') this.routing.startPoint = edge;
        else this.routing.endPoint = edge;
        this.$refs.mapGraph.setRoutingMarker(edge.uid, mode);
        this.routing.activeMode = null;
        this.$refs.mapGraph.setCursor('grab');
      } else {
        this.selectedEdge = edge;
        this.ui.panelOpen = true;
      }
    },

    toggleRoutingMode(mode) {
      if (this.routing.activeMode === mode) {
        this.routing.activeMode = null;
        this.$refs.mapGraph.setCursor('grab');
      } else {
        this.routing.activeMode = mode;
        this.ui.panelOpen = false;
        this.$refs.mapGraph.setCursor('crosshair');
        this.showToast('Seleziona un punto sulla mappa', 'warning');
      }
    },

    /** Innesca il calcolo Dijkstra (Bridge API) */
    async executeDijkstra() {
      if (!this.routing.startPoint || !this.routing.endPoint) return;
      this.showToast('Richiesta calcolo percorso...', 'info');

      const closedEdgesArray = this.$refs.mapGraph.getClosedEdgesIds();
      const savedWeights = JSON.parse(localStorage.getItem('quidsi_algorithm_weights') || '{}');

      const payload = {
        start_id: String(this.routing.startPoint.id),
        end_id: String(this.routing.endPoint.id),
        closed_edges: closedEdgesArray,
        weights: savedWeights
      };

      try {
        const response = await fetch('http://localhost:3000/api/dijkstra', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data.success && data.path.length) {
          this.hasActiveRoute = true;
          this.$refs.mapGraph.drawRoute(data.path);
          this.showToast('Percorso calcolato con successo', 'success');
        }
      } catch (error) {
        console.error("API Error:", error);
        this.showToast('Errore server (Offline)', 'error');
      }
    },

    /** * GESTIONE SCENARI: Iniezione dei dati sulla mappa 
     */
    handleLoadScenario(scenario) {
      // 1. Pulisce la mappa esistente
      this.softReset();

      // 2. Itera sulle strade chiuse salvate nello scenario e le marca come chiuse
      if (scenario.closed_edges && scenario.closed_edges.length > 0) {
        scenario.closed_edges.forEach(id => {
          this.$refs.mapGraph.updateGroupStyle(id, true);
        });
        this.showToast(`Scenario "${scenario.name}" caricato con ${scenario.closed_edges.length} chiusure.`, 'success');
      } else {
        this.showToast(`Scenario "${scenario.name}" caricato (mappa libera).`, 'info');
      }
    },

    /** Richiesta di salvataggio dello stato attuale */
    handleSaveScenario(name) {
      const closedIds = this.$refs.mapGraph.getClosedEdgesIds();
      this.showToast(`Salvataggio scenario "${name}"...`, 'info');
      // In un caso reale qui andrebbe la fetch POST verso /api/scenarios
    },

    closeSidebar() { this.ui.panelOpen = false; },

    softReset() {
      this.routing.startPoint = null; this.routing.endPoint = null; this.routing.activeMode = null;
      this.selectedEdge = null; this.ui.panelOpen = false; this.hasActiveRoute = false;
      this.$refs.mapGraph.setCursor('grab');
      this.$refs.mapGraph.resetAll();
    },

    runSimulation(mode) {
      if (!this.selectedEdge) return;
      const newState = !this.selectedEdge.isClosed;
      if (mode === 'portion') this.$refs.mapGraph.updateSingleEdgeStyle(this.selectedEdge.uid, newState);
      else this.$refs.mapGraph.updateGroupStyle(this.selectedEdge.id, newState);
      this.selectedEdge = { ...this.selectedEdge, isClosed: newState };

      if (this.hasActiveRoute) this.executeDijkstra(); // Ricalcolo reattivo
    }
  }
};
</script>

<style>
/* CSS Globale */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');

:root {
  --dss-navy: #0f172a;
  --dss-blue: #2563eb;
  --header-height: 60px;
}

body,
html {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
  font-family: 'Inter', sans-serif;
  background: #f1f5f9;
}

.dss-main-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: relative;
}

/* Toast */
.toast-container {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.toast {
  background: #1e293b;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  pointer-events: auto;
}

.toast-success {
  border-bottom: 3px solid #10b981;
}

.toast-warning {
  border-bottom: 3px solid #f59e0b;
}

.toast-info {
  border-bottom: 3px solid #3b82f6;
}

/* Header */
.dss-header {
  height: var(--header-height);
  background: var(--dss-navy);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  z-index: 2000;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.brand {
  display: flex;
  align-items: center;
  font-size: 14px;
  letter-spacing: 1px;
}

.brand-bold {
  font-weight: 800;
  color: var(--dss-blue);
}

.brand-separator {
  margin: 0 10px;
  opacity: 0.3;
}

.header-search-wrapper {
  flex: 0 1 400px;
  position: relative;
}

.search-input-group input {
  width: 100%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 8px 15px;
  border-radius: 6px;
  color: white;
  outline: none;
  transition: 0.3s;
}

.search-input-group input:focus {
  background: white;
  color: black;
}

.search-dropdown {
  position: absolute;
  top: 110%;
  left: 0;
  right: 0;
  background: white;
  border-radius: 6px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  list-style: none;
  padding: 5px 0;
  margin: 0;
  z-index: 3000;
}

.search-dropdown li {
  padding: 10px 15px;
  cursor: pointer;
  color: #333;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
}

.search-dropdown li:hover {
  background: #eff6ff;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.btn-reset-global {
  background: transparent;
  color: #94a3b8;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 700;
  cursor: pointer;
}

.btn-system {
  background: var(--dss-blue);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 700;
  cursor: pointer;
}

.dss-viewport {
  flex: 1;
  position: relative;
}

/* Animazioni */
.toast-anim-enter-active,
.toast-anim-leave-active {
  transition: all 0.3s;
}

.toast-anim-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.toast-anim-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>