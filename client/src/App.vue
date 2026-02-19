<template>
  <div id="app" class="dss-main-container" :class="{ 'preview-mode': dssStore.printMode }">
    <div v-if="uiStore.isCalculating" class="global-overlay">
      <div class="spinner-container">
        <div class="spinner"></div>
        <div class="spinner-text">
          <span>Calcolo percorso in corso...</span>
          <button class="btn-cancel-calc" @click="dssStore.currentAbortController?.abort()">Annulla (ESC)</button>
        </div>
      </div>
    </div>

    <div class="toast-container">
      <transition-group name="toast-anim">
        <div v-for="toast in uiStore.toasts" :key="toast.id" :class="['toast', `toast-${toast.type}`]">
          <span class="toast-icon">
            {{ toast.type === 'success' ? '✅' : toast.type === 'error' ? '⚠️' : 'ℹ️' }}
          </span>
          {{ toast.message }}
        </div>
      </transition-group>
    </div>

    <header class="dss-header">
      <div class="brand">
        <span class="brand-bold">QUIDSI</span><span class="brand-separator">|</span><span class="brand-sub">TRENTO DSS</span>
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
        <div class="history-controls">
          <button class="btn-icon" @click="dssStore.undoClosure()" :disabled="!dssStore.canUndo" title="Annulla ultima chiusura (Ctrl+Z)">
            ↩️
          </button>
          <button class="btn-icon" @click="dssStore.redoClosure()" :disabled="!dssStore.canRedo" title="Ripristina chiusura annullata (Ctrl+Y)">
            ↪️
          </button>
        </div>
        <div class="header-divider"></div>

        <button class="btn-reset btn-reset-route" @click="dssStore.clearRoute()" title="Azzera Percorso">AZZERA PERCORSO</button>
        <button class="btn-reset btn-reset-closures" @click="dssStore.clearClosures()" title="Rimuovi tutti i cantieri">AZZERA CANTIERI</button>
        <button class="btn-system" @click="ui.fullScreenOpen = true">SISTEMA</button>
      </div>
    </header>

    <div class="print-header-section">
      <div class="print-logos">
        <h2>🇮🇹 COMUNE DI TRENTO</h2>
        <p>Servizio Gestione Strade e Parchi - Ufficio Viabilità</p>
      </div>
      <div class="print-title">
        <h1>RAPPORTO DI IMPATTO VIABILISTICO</h1>
        <p>Documento Tecnico di Supporto alle Decisioni (DSS)</p>
      </div>
      <div class="print-metadata-wrapper">
        <div class="print-metadata">
          <div class="meta-box"><strong>Data:</strong> {{ new Date().toLocaleDateString('it-IT') }}</div>
          <div class="meta-box"><strong>Profilo:</strong> {{ dssStore.vehicleProfile.toUpperCase() }}</div>
          <div class="meta-box"><strong>Chiusure:</strong> {{ dssStore.activeClosureIds.length }}</div>

          <template v-if="dssStore.activeRoutePath.length">
            <div class="meta-box"><strong>Distanza:</strong> {{ dssStore.routeStats.distance }} km</div>
            <div class="meta-box"><strong>Tempo:</strong> {{ dssStore.routeStats.duration }} min</div>
          </template>

          <div v-if="dssStore.routeImpact" class="meta-box impact-highlight">
            <strong>Impatto:</strong> +{{ dssStore.routeImpact.percent }}% ritardo ({{ dssStore.routeImpact.timeDiff }} min)
          </div>
        </div>
      </div>
    </div>

    <main class="dss-viewport">
      <MapGraph 
        :closedEdges="dssStore.activeClosureIds" :routePath="dssStore.activeRoutePath"
        :startPoint="dssStore.routing.startPoint" :endPoint="dssStore.routing.endPoint" :cursor="dssStore.mapCursor"
        :focusEdgeId="dssStore.mapFocusId" :sidebarOpen="dssStore.isSidebarOpen" :printMode="dssStore.printMode"
        @select-edge="handleEdgeSelect" @graph-loaded="handleGraphLoaded" @focus-consumed="dssStore.mapFocusId = null"
        @missed-click="handleMissedClick" 
      />

      <Sidebar 
        :isOpen="dssStore.isSidebarOpen" :selectedEdge="dssStore.selectedEdge" @close="dssStore.closeSidebar()"
        @simulate-portion="dssStore.toggleClosure(dssStore.selectedEdge, false)"
        @simulate-entire="dssStore.toggleClosure(dssStore.selectedEdge, true)" 
      />

      <RoutingWidget 
        :startPoint="dssStore.routing.startPoint" :endPoint="dssStore.routing.endPoint"
        :activeMode="dssStore.routing.activeMode" @toggle-mode="dssStore.toggleRoutingMode"
        @calculate="dssStore.executeDijkstra" 
      />

      <ActiveClosures />
      <MapLegend />
      <RouteStats />
      <VehicleProfile />
    </main>

    <div class="print-footer-section">
      
      <div v-if="dssStore.sensitiveZonesAlerts && dssStore.sensitiveZonesAlerts.length" class="print-alert-box">
        <h4>⚠️ AVVISI ZONE SENSIBILI (POI)</h4>
        <ul>
          <li v-for="alert in dssStore.sensitiveZonesAlerts" :key="alert.poi.id">
            <strong>{{ alert.poi.name }}:</strong> {{ alert.msg }}
          </li>
        </ul>
      </div>

      <div class="print-data-section">
        <div class="print-column">
          <template v-if="dssStore.activeRoutePath.length && dssStore.activeClosureIds.length">
            <h3>ANALISI COMPARATIVA TEMPI</h3>
            <ImpactChart 
              :baseline="dssStore.baselineStats.duration" 
              :current="dssStore.routeStats.duration" 
            />
          </template>

          <h3 style="margin-top: 20px;">DISTINTA CHIUSURE FISICHE (CANTIERI)</h3>
          <ul v-if="dssStore.activeClosuresObjects && dssStore.activeClosuresObjects.length" class="print-list">
            <li v-for="c in dssStore.activeClosuresObjects" :key="c.id">
              [ID: {{ c.id }}] - {{ c.name }}
            </li>
          </ul>
          <p v-else class="print-empty">Nessun cantiere attivo in questo scenario.</p>
        </div>

        <div class="print-column">
          <h3>ITINERARIO ALTERNATIVO</h3>
          <ul v-if="dssStore.textualItinerary && dssStore.textualItinerary.length" class="print-list">
            <li v-for="(step, i) in dssStore.textualItinerary" :key="i">{{ i + 1 }}. {{ step }}</li>
          </ul>
          <p v-else class="print-empty">Nessun percorso calcolato.</p>
        </div>
      </div>

      <div class="print-footer">
        <div class="signature-box">
          <p>Il Tecnico Incaricato</p>
          <div class="signature-line"></div>
        </div>
      </div>
    </div>

    <FullscreenMenu 
      :isOpen="ui.fullScreenOpen" @close="ui.fullScreenOpen = false" @load-scenario="handleLoadScenario"
      @save-request="handleSaveScenario" 
    />
  </div>
</template>

<script>
import { ApiService } from './services/api';
import { StorageService } from './services/storage';
import { SearchService } from './services/searchService';
import { uiStore } from './store/uiStore';
import { useDssStore } from './store/dssStore';

import MapGraph from './components/MapGraph.vue';
import Sidebar from './components/Sidebar.vue';
import FullscreenMenu from './components/FullscreenMenu.vue';
import RoutingWidget from './components/RoutingWidget.vue';
import MapLegend from './components/MapLegend.vue';
import ActiveClosures from './components/ActiveClosures.vue';
import RouteStats from './components/RouteStats.vue';
import VehicleProfile from './components/VehicleProfile.vue';
import ImpactChart from './components/ImpactChart.vue'; // <-- Import component Grafico

export default {
  name: 'App',
  components: { MapGraph, Sidebar, FullscreenMenu, RoutingWidget, MapLegend, ActiveClosures, RouteStats, VehicleProfile, ImpactChart },

  setup() {
    const dssStore = useDssStore();
    return { dssStore, uiStore };
  },

  data() {
    return { searchQuery: '', searchResults: [], searchTimeout: null, currentSearchToken: 0, ui: { fullScreenOpen: false } };
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
  },

  methods: {
    handleKeydown(e) {
      if (e.key === 'Escape') {
        if (this.uiStore.isCalculating) this.dssStore.currentAbortController?.abort();
        else if (this.dssStore.routing.activeMode) {
          this.dssStore.toggleRoutingMode(null);
          this.uiStore.showToast('Selezione punto annullata', 'info');
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        this.dssStore.undoClosure();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        this.dssStore.redoClosure();
      }
    },
    handleMissedClick() { this.uiStore.showToast('Nessuna strada trovata qui.', 'warning'); },
    handleOffline() { this.uiStore.showToast('App Offline.', 'error'); },
    handleOnline() { this.uiStore.showToast('Connessione ripristinata.', 'success'); },

    handleSearch() {
      clearTimeout(this.searchTimeout);
      if (this.searchQuery.length < 2) { this.searchResults = []; return; }
      const myToken = ++this.currentSearchToken;
      this.searchTimeout = setTimeout(async () => {
        try {
          const results = await SearchService.search(this.searchQuery);
          if (this.currentSearchToken === myToken) this.searchResults = results;
        } catch (e) { console.error(e); }
      }, 150);
    },

    selectRoad(baseId) {
      this.dssStore.setFocusEdge(baseId);
      const roadData = this.dssStore.roadList.find(r => r.id.startsWith(baseId));
      if (roadData) this.dssStore.openSidebar({ id: roadData.id, street: roadData.street, uid: roadData.uid });
      this.searchQuery = '';
      this.searchResults = [];
    },

    handleEdgeSelect(edge) {
      if (this.dssStore.routing.activeMode) {
        if (this.dssStore.routing.activeMode === 'start') this.dssStore.routing.startPoint = edge;
        else this.dssStore.routing.endPoint = edge;
        this.dssStore.toggleRoutingMode(null);
      } else {
        this.dssStore.openSidebar(edge);
      }
    },

    handleLoadScenario(scenario) {
      this.dssStore.closeSidebar();
      if (scenario.closed_edges) {
        this.dssStore.closuresHistory = [];
        this.dssStore.closuresFuture = [];

        const allRoads = this.dssStore.roadList;
        const expandedIds = [];
        scenario.closed_edges.forEach(baseId => {
          const stringId = String(baseId);
          const matches = allRoads.filter(r => r.id === stringId || r.id.startsWith(stringId + '_')).map(r => r.id);
          expandedIds.push(...matches);
        });
        this.dssStore.activeClosureIds = [...new Set(expandedIds)];
        StorageService.saveClosures(this.dssStore.activeClosureIds);
        this.uiStore.showToast(`Scenario "${scenario.name}" attivo`, 'success');
        this.dssStore.triggerAutoRecalc();
      }
    },

    handleSaveScenario(name) {
      this.uiStore.showToast(`Salvataggio "${name}"...`, 'info');
      ApiService.saveScenario(name, this.dssStore.activeClosureIds);
    },

    handleGraphLoaded(list) {
      this.dssStore.setRoadList(list);
      SearchService.buildIndex(list);
      const savedClosures = StorageService.getClosures();
      if (savedClosures && savedClosures.length > 0) {
        const validIds = new Set(list.map(r => String(r.id)));
        const validClosures = savedClosures.filter(id => id !== 'undefined' && id !== 'null' && validIds.has(String(id)));
        this.dssStore.activeClosureIds = [...validClosures];
        if (validClosures.length !== savedClosures.length) StorageService.saveClosures(this.dssStore.activeClosureIds);
        if (validClosures.length > 0) this.uiStore.showToast('Ripristinate chiusure salvate', 'info');
      }
    }
  }
};
</script>

<style>
.toast {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #1e293b;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  pointer-events: auto;
}

.toast-icon {
  font-size: 16px;
}

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');

:root {
  --dss-navy: #0f172a;
  --dss-blue: #2563eb;
  --header-height: 60px;
}

body, html {
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
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(3px);
  z-index: 5000;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: wait;
}

.spinner-container {
  background: white;
  padding: 20px 30px;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 18px;
  font-weight: 800;
  color: #1e293b;
  font-size: 14px;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 4px solid #e2e8f0;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spinner-text {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.btn-cancel-calc {
  background: transparent;
  border: 1px solid #ef4444;
  color: #ef4444;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  cursor: pointer;
  font-weight: 800;
  transition: 0.2s;
  align-self: flex-start;
}

.btn-cancel-calc:hover {
  background: #fee2e2;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

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

.brand { display: flex; align-items: center; font-size: 14px; letter-spacing: 1px; }
.brand-bold { font-weight: 800; color: var(--dss-blue); }
.brand-separator { margin: 0 10px; opacity: 0.3; }

.header-search-wrapper { flex: 0 1 400px; position: relative; }
.search-input-group input { width: 100%; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); padding: 8px 15px; border-radius: 6px; color: white; outline: none; transition: 0.3s; }
.search-input-group input:focus { background: white; color: black; }
.search-dropdown { position: absolute; top: 110%; left: 0; right: 0; background: white; border-radius: 6px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2); list-style: none; padding: 5px 0; margin: 0; z-index: 3000; }
.search-dropdown li { padding: 10px 15px; cursor: pointer; color: #333; border-bottom: 1px solid #f1f5f9; display: flex; flex-direction: column; }
.search-dropdown li:hover { background: #eff6ff; }

.header-actions { display: flex; align-items: center; gap: 10px; }

.history-controls { display: flex; gap: 5px; background: rgba(255, 255, 255, 0.05); padding: 4px; border-radius: 6px; }
.btn-icon { background: transparent; border: none; font-size: 16px; cursor: pointer; opacity: 0.8; transition: 0.2s; padding: 4px; border-radius: 4px; }
.btn-icon:hover:not(:disabled) { opacity: 1; background: rgba(255, 255, 255, 0.1); }
.btn-icon:disabled { opacity: 0.3; cursor: not-allowed; filter: grayscale(100%); }

.header-divider { width: 1px; height: 24px; background: rgba(255, 255, 255, 0.2); margin: 0 10px; }

.btn-reset { background: transparent; border: 1px solid rgba(255, 255, 255, 0.2); padding: 6px 12px; border-radius: 6px; font-weight: 700; cursor: pointer; color: white; transition: 0.2s; font-size: 11px; }
.btn-reset:hover { background: rgba(255, 255, 255, 0.1); }
.btn-reset-closures:hover { border-color: #ef4444; color: #ef4444; }
.btn-reset-route:hover { border-color: #f59e0b; color: #f59e0b; }

.btn-system { background: var(--dss-blue); color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 700; cursor: pointer; }

.dss-viewport { flex: 1; position: relative; }

.toast-anim-enter-active, .toast-anim-leave-active { transition: all 0.3s; }
.toast-anim-enter-from { opacity: 0; transform: translateY(20px); }
.toast-anim-leave-to { opacity: 0; transform: translateY(-20px); }

/* =========================================
   STAMPA E GENERAZIONE PDF (CSS NATIVO A4)
   ========================================= */

/* 1. Modalità ANTEPRIMA A SCHERMO (PRE-STAMPA) */
.preview-mode {
  background: #f1f5f9 !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
}

.preview-mode .dss-header,
.preview-mode .routing-widget,
.preview-mode .sidebar,
.preview-mode .vehicle-selector,
.preview-mode .btn-system,
.preview-mode .btn-reset,
.preview-mode .close-fs,
.preview-mode .history-controls {
  display: none !important;
}

.preview-mode .print-header-section,
.preview-mode .print-footer-section {
  display: none !important;
}

.preview-mode .dss-viewport,
.preview-mode .map-wrapper,
.preview-mode #map {
  height: 12cm !important;
  width: 18cm !important;
  max-width: 18cm !important;
  position: relative !important;
  margin-top: auto;
  margin-bottom: auto;
  box-sizing: border-box !important;
}

.print-header-section,
.print-footer-section {
  display: none;
}

/* 2. STAMPA REALE */
@media print {
  @page {
    size: A4 portrait;
    margin: 1.5cm;
  }

  body, html {
    background: white !important;
    overflow: visible !important;
    height: auto !important;
  }

  .dss-header,
  .routing-widget,
  .closures-widget,
  .vehicle-selector,
  .fs-overlay,
  .toast-container,
  .leaflet-control-container,
  .global-overlay,
  .history-controls {
    display: none !important;
  }

  .dss-main-container {
    display: block !important;
    height: auto !important;
    width: 18cm !important;
    margin: 0 auto !important;
  }

  .dss-main-container.preview-mode .print-header-section,
  .dss-main-container.preview-mode .print-footer-section,
  .print-header-section,
  .print-footer-section {
    display: block !important;
    width: 18cm !important;
    font-family: 'Inter', sans-serif;
    color: black;
  }

  .print-header-section {
    border-bottom: 2px solid #0f172a;
    padding-bottom: 10px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  .print-logos h2 { margin: 0; font-size: 16px; font-weight: 900; }
  .print-logos p { margin: 0; font-size: 10px; color: #475569; }

  .print-title { text-align: right; }
  .print-title h1 { margin: 0; font-size: 18px; font-weight: 900; color: #2563eb; }
  .print-title p { margin: 0; font-size: 10px; font-weight: bold; }

  .print-metadata-wrapper { width: 100%; margin-top: 15px; }

  .print-metadata {
    display: flex;
    flex-wrap: wrap; 
    gap: 15px;
    background: #f8fafc;
    padding: 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
  }

  .meta-box { font-size: 11px; }

  .impact-highlight {
    color: #ef4444 !important;
    font-weight: 800 !important;
    background: #fee2e2 !important;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid #ef4444 !important;
  }

  .dss-viewport {
    position: relative !important;
    height: 12cm !important;
    width: 18cm !important;
    max-width: 18cm !important;
    border: 2px solid #cbd5e1 !important;
    page-break-inside: avoid;
    margin-bottom: 20px;
    overflow: hidden !important;
    box-sizing: border-box !important;
  }

  #map, .map-wrapper {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 18cm !important;
    height: 12cm !important;
  }

  /* Nascondiamo il riquadro fluttuante per lasciare pulita la mappa in stampa */
  .route-stats-panel {
    display: none !important;
  }

  .map-legend {
    position: absolute !important;
    bottom: 10px !important;
    right: 10px !important;
    background: white !important;
    border: 1px solid black !important;
    z-index: 9999 !important;
    box-shadow: none !important;
  }

  /* NUOVO: Stili per gli Alert POI nel PDF */
  .print-alert-box { 
    background: #fff7ed; 
    border: 2px solid #f97316; 
    padding: 12px; 
    border-radius: 6px; 
    margin-bottom: 20px; 
  }
  .print-alert-box h4 { 
    margin: 0 0 8px 0; 
    color: #c2410c; 
    font-size: 11px; 
    font-weight: 900; 
    letter-spacing: 0.5px; 
  }
  .print-alert-box ul { 
    margin: 0; 
    padding-left: 20px; 
  }
  .print-alert-box li { 
    font-size: 10px; 
    color: #431407; 
    margin-bottom: 4px; 
    line-height: 1.4; 
  }

  /* FIX: Mantiene l'altezza fissa del grafico in stampa */
  .chart-container {
    height: 180px !important;
    width: 100% !important;
    page-break-inside: avoid;
  }
  canvas { 
    max-width: 100% !important; 
    height: 180px !important; 
  }

  .print-data-section { display: flex; gap: 30px; }

  .print-column { flex: 1; }

  .print-column h3 {
    font-size: 12px;
    font-weight: 900;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 5px;
    color: #0f172a;
    margin-bottom: 10px;
  }

  .print-list {
    padding-left: 15px;
    font-size: 10px;
    line-height: 1.6;
    margin: 0;
  }

  .print-empty {
    font-size: 10px;
    font-style: italic;
    color: #64748b;
    margin: 0;
  }

  .print-footer {
    margin-top: 50px;
    display: flex;
    justify-content: flex-end;
    page-break-inside: avoid;
  }

  .signature-box {
    width: 6cm;
    text-align: center;
  }

  .signature-box p {
    font-size: 11px;
    font-weight: bold;
    margin-bottom: 40px;
  }

  .signature-line {
    border-top: 1px dashed black;
  }
}
</style>