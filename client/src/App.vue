<template>
  <div id="app" class="dss-main-container">
    
    <div v-if="uiStore.isCalculating" class="global-overlay">
      <div class="spinner-container">
        <div class="spinner"></div>
        <div class="spinner-text">
          <span>Calcolo percorso in corso...</span>
          <button class="btn-cancel-calc" @click="cancelCalculation">Annulla (ESC)</button>
        </div>
      </div>
    </div>

    <div class="toast-container">
      <transition-group name="toast-anim">
        <div v-for="toast in uiStore.toasts" :key="toast.id" :class="['toast', `toast-${toast.type}`]">{{ toast.message }}</div>
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
          <input type="text" v-model="searchQuery" placeholder="🔍 Cerca via o ID..." @input="handleSearch" />
          <ul v-if="searchResults.length" class="search-dropdown">
            <li v-for="res in searchResults" :key="res.id" @click="selectRoad(res.id)">
              <span class="res-street">{{ res.street }}</span>
              <span class="res-id">ID: {{ res.id }}</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="header-actions">
        <button class="btn-reset-global" @click="softReset">↺ RESET</button>
        <button class="btn-system" @click="ui.fullScreenOpen = true">SISTEMA</button>
      </div>
    </header>

    <main class="dss-viewport">
      <MapGraph 
        :closedEdges="activeClosureIds"
        :routePath="activeRoutePath"
        :startPoint="routing.startPoint"
        :endPoint="routing.endPoint"
        :cursor="mapCursor"
        :focusEdgeId="mapFocusId"
        :sidebarOpen="ui.panelOpen" 
        @select-edge="handleEdgeSelect" 
        @graph-loaded="handleGraphLoaded"
        @focus-consumed="mapFocusId = null"
        @missed-click="handleMissedClick" 
      /> <RoutingWidget 
        :startPoint="routing.startPoint" :endPoint="routing.endPoint" :activeMode="routing.activeMode"
        @toggle-mode="toggleRoutingMode" @calculate="executeDijkstra" 
      />

      <ActiveClosures :closedStreets="activeClosuresObjects" @zoom-to="selectRoad" @reopen="handleQuickReopen" />

      <MapLegend />
    </main>

    <Sidebar :isOpen="ui.panelOpen" :selectedEdge="selectedEdge" @close="closeSidebar"
      @simulate-portion="runSimulation" @simulate-entire="runSimulation" />

    <FullscreenMenu :isOpen="ui.fullScreenOpen" @close="ui.fullScreenOpen = false" @load-scenario="handleLoadScenario" @save-request="handleSaveScenario" />
  </div>
</template>

<script>
import { ApiService } from './services/api';
import { StorageService } from './services/storage';
import { SearchService } from './services/searchService';
import { uiStore } from './store/uiStore';

import MapGraph from './components/MapGraph.vue';
import Sidebar from './components/Sidebar.vue';
import FullscreenMenu from './components/FullscreenMenu.vue';
import RoutingWidget from './components/RoutingWidget.vue';
import MapLegend from './components/MapLegend.vue';
import ActiveClosures from './components/ActiveClosures.vue';

export default {
  name: 'App',
  components: { MapGraph, Sidebar, FullscreenMenu, RoutingWidget, MapLegend, ActiveClosures },
  data() {
    return {
      uiStore, 
      roadList: [], 
      
      activeClosureIds: [],
      activeRoutePath: [],
      routing: { startPoint: null, endPoint: null, activeMode: null },
      mapCursor: 'grab',
      mapFocusId: null,

      selectedEdge: null,
      searchQuery: '', searchResults: [], searchTimeout: null,
      currentSearchToken: 0,
      ui: { panelOpen: false, fullScreenOpen: false }, 
      currentAbortController: null,
      recalcTimeout: null
    };
  },
  computed: {
    activeClosuresObjects() {
      return this.activeClosureIds.map(id => {
        const road = this.roadList.find(r => String(r.id) === String(id));
        return { id, name: road ? road.street : `Arco ${id}` };
      });
    }
  },
  mounted() {
    window.addEventListener('keydown', this.handleKeydown);
    window.addEventListener('offline', this.handleOffline);
    window.addEventListener('online', this.handleOnline);
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleKeydown);
    window.removeEventListener('offline', this.handleOffline);
    window.removeEventListener('online', this.handleOnline);
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    if (this.recalcTimeout) clearTimeout(this.recalcTimeout);
    this.cancelCalculation();
  },
  methods: {
    handleKeydown(e) {
      if (e.key === 'Escape') {
        if (this.uiStore.isCalculating) this.cancelCalculation();
        else if (this.routing.activeMode) {
          this.routing.activeMode = null;
          this.mapCursor = 'grab';
          this.uiStore.showToast('Selezione punto annullata', 'info');
        }
      }
    },
    handleMissedClick() {
      this.uiStore.showToast('Nessuna strada trovata qui. Fai zoom o clicca esattamente su una via.', 'warning');
    },
    handleOffline() { 
      this.uiStore.showToast('Connessione di rete assente. L\'app è offline.', 'error'); 
    },
    handleOnline() { 
      this.uiStore.showToast('Connessione ripristinata.', 'success'); 
    },

    handleSearch() {
      clearTimeout(this.searchTimeout);
      if (this.searchQuery.length < 2) { this.searchResults = []; return; }
      
      const myToken = ++this.currentSearchToken;

      this.searchTimeout = setTimeout(async () => {
        try {
          const results = await SearchService.search(this.searchQuery);
          if (this.currentSearchToken === myToken) {
            this.searchResults = results;
          }
        } catch (e) {
          console.error("Errore ricerca:", e);
        }
      }, 150);
    },

    selectRoad(id) {
      this.mapFocusId = String(id);
      this.searchQuery = ''; this.searchResults = [];
    },

    handleEdgeSelect(edge) {
      if (this.routing.activeMode) {
        if (this.routing.activeMode === 'start') this.routing.startPoint = edge;
        else this.routing.endPoint = edge;
        this.routing.activeMode = null;
        this.mapCursor = 'grab';
      } else {
        this.selectedEdge = edge;
        this.ui.panelOpen = true;
      }
    },

    toggleRoutingMode(mode) {
      this.routing.activeMode = this.routing.activeMode === mode ? null : mode;
      if (this.routing.activeMode) {
        this.ui.panelOpen = false;
        this.mapCursor = 'crosshair';
        this.uiStore.showToast('Seleziona un punto sulla mappa', 'warning');
      } else {
        this.mapCursor = 'grab';
      }
    },

    triggerAutoRecalc() {
      if (this.activeRoutePath.length === 0) return;
      if (this.recalcTimeout) clearTimeout(this.recalcTimeout);
      this.recalcTimeout = setTimeout(() => this.executeDijkstra(), 600);
    },

    async executeDijkstra() {
      if (!this.routing.startPoint || !this.routing.endPoint) return;
      
      this.cancelCalculation();

      this.uiStore.setCalculating(true); 
      this.currentAbortController = new AbortController();
      const timeoutId = setTimeout(() => this.cancelCalculation('Timeout'), 15000);

      const payload = {
        start_id: this.routing.startPoint.id, 
        end_id: this.routing.endPoint.id,
        closed_edges: this.activeClosureIds,
        weights: StorageService.getWeights() 
      };

      try {
        const data = await ApiService.calculateRoute(payload, this.currentAbortController.signal);
        
        if (data && data.success && data.path && data.path.length) {
          this.activeRoutePath = data.path; 
          this.uiStore.showToast('Percorso ottimale ricalcolato', 'success');
        } else {
          this.activeRoutePath = []; 
          this.uiStore.showToast('Nessun percorso disponibile', 'warning');
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          this.activeRoutePath = []; 
          const errMap = { 'ABORTED': 'Calcolo interrotto', 'NOT_FOUND': 'Destinazione isolata', 'VALIDATION_ERROR': 'Punti non validi' };
          this.uiStore.showToast(errMap[error.message] || 'Errore server', 'error');
        }
      } finally {
        clearTimeout(timeoutId);
        this.uiStore.setCalculating(false);
        this.currentAbortController = null;
      }
    },

    cancelCalculation() {
      if (this.currentAbortController) {
        this.currentAbortController.abort();
        this.currentAbortController = null;
      }
    },

    runSimulation() {
      if (!this.selectedEdge) return;
      const idStr = String(this.selectedEdge.id);
      
      if (this.selectedEdge.isClosed) {
        this.activeClosureIds = this.activeClosureIds.filter(id => id !== idStr);
      } else {
        if (!this.activeClosureIds.includes(idStr)) this.activeClosureIds.push(idStr);
      }
      
      this.selectedEdge.isClosed = !this.selectedEdge.isClosed;
      StorageService.saveClosures(this.activeClosureIds);
      this.triggerAutoRecalc(); 
    },

    handleQuickReopen(id) {
      this.activeClosureIds = this.activeClosureIds.filter(c => String(c) !== String(id));
      StorageService.saveClosures(this.activeClosureIds);
      this.triggerAutoRecalc();
      this.uiStore.showToast('Strada ripristinata', 'success');
    },

    handleLoadScenario(scenario) {
      this.softReset();
      if (scenario.closed_edges) {
        this.activeClosureIds = [...scenario.closed_edges];
        StorageService.saveClosures(this.activeClosureIds);
        this.uiStore.showToast(`Scenario "${scenario.name}" attivo`, 'success');
      }
    },

    handleSaveScenario(name) {
      this.uiStore.showToast(`Salvataggio "${name}"...`, 'info');
      ApiService.saveScenario(name, this.activeClosureIds);
    },

    handleGraphLoaded(list) { 
      this.roadList = list; 
      SearchService.buildIndex(list); 
      
      const savedClosures = StorageService.getClosures(); 
      if (savedClosures.length > 0) {
        const validIds = new Set(list.map(r => String(r.id)));
        const validClosures = savedClosures.filter(id => validIds.has(String(id)));

        this.activeClosureIds = [...validClosures]; 

        if (validClosures.length < savedClosures.length) {
          StorageService.saveClosures(this.activeClosureIds);
          this.uiStore.showToast('Il grafo è stato aggiornato: alcune chiusure obsolete sono state rimosse', 'warning');
        } else {
          this.uiStore.showToast('Ripristinate chiusure salvate', 'info');
        }
      }
    },

    closeSidebar() { this.ui.panelOpen = false; },

    softReset() {
      this.cancelCalculation();
      this.routing = { startPoint: null, endPoint: null, activeMode: null };
      this.selectedEdge = null; this.ui.panelOpen = false;
      this.activeRoutePath = [];
      this.activeClosureIds = [];
      this.mapCursor = 'grab';
      StorageService.clearClosures(); 
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

.global-overlay {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(3px);
  z-index: 5000;
  display: flex; align-items: center; justify-content: center;
  cursor: wait;
}
.spinner-container {
  background: white; padding: 20px 30px; border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2); border: 1px solid #e2e8f0;
  display: flex; align-items: center; gap: 18px; font-weight: 800; color: #1e293b; font-size: 14px;
}
.spinner {
  width: 28px; height: 28px; border: 4px solid #e2e8f0; border-top-color: #2563eb; 
  border-radius: 50%; animation: spin 1s linear infinite;
}
.spinner-text { display: flex; flex-direction: column; gap: 6px; }
.btn-cancel-calc {
  background: transparent; border: 1px solid #ef4444; color: #ef4444; 
  padding: 4px 8px; border-radius: 4px; font-size: 10px; cursor: pointer; 
  font-weight: 800; transition: 0.2s; align-self: flex-start;
}
.btn-cancel-calc:hover { background: #fee2e2; }

@keyframes spin { to { transform: rotate(360deg); } }

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

.toast-success { border-bottom: 3px solid #10b981; }
.toast-warning { border-bottom: 3px solid #f59e0b; }
.toast-error { border-bottom: 3px solid #ef4444; }
.toast-info { border-bottom: 3px solid #3b82f6; }

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