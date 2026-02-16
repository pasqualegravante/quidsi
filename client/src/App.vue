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
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="🔍 Cerca toponimo o ID (es. Piazza Duomo)..." 
            @input="handleSearch" 
          />
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
      <MapGraph 
        ref="mapGraph" 
        @select-edge="handleEdgeSelect" 
        @graph-loaded="handleGraphLoaded" 
      />
      
      <RoutingWidget 
        :startPoint="routing.startPoint"
        :endPoint="routing.endPoint"
        :activeMode="routing.activeMode"
        @toggle-mode="toggleRoutingMode"
        @calculate="executeDijkstra"
      />
    </main>

    <Sidebar 
      :isOpen="ui.panelOpen" 
      :selectedEdge="selectedEdge"
      @close="closeSidebar"
      @simulate-portion="runSimulation('portion')"
      @simulate-entire="runSimulation('entire')"
    />

    <FullscreenMenu 
      :isOpen="ui.fullScreenOpen" 
      @close="ui.fullScreenOpen = false" 
    />
  </div>
</template>

<script>
/**
 * @file App.vue
 * @description Root Component del Decision Support System (DSS).
 * Orchestratore centrale dello stato reattivo: gestisce la comunicazione 
 * bidirezionale tra i layer UI, il motore cartografico e l'API Node.js.
 */
import MapGraph from './components/MapGraph.vue';
import Sidebar from './components/Sidebar.vue';
import FullscreenMenu from './components/FullscreenMenu.vue';
import RoutingWidget from './components/RoutingWidget.vue';

export default {
  name: 'App',
  components: { MapGraph, Sidebar, FullscreenMenu, RoutingWidget },
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
      
      /** @type {Boolean} Flag di stato: indica se un tragitto Dijkstra è attualmente renderizzato */
      hasActiveRoute: false 
    };
  },
  methods: {
    showToast(message, type = 'info') {
      const id = Date.now() + Math.random(); 
      this.toasts.push({ id, message, type });
      setTimeout(() => { this.toasts = this.toasts.filter(t => t.id !== id); }, 3500);
    },

    handleSearch() {
      clearTimeout(this.searchTimeout); 
      if (this.searchQuery.length < 2) { this.searchResults = []; return; }
      this.searchTimeout = setTimeout(() => { 
        const q = this.searchQuery.toLowerCase(); 
        const finalResults = []; const savedIds = []; 
        for (const road of this.roadList) { 
          const streetStr = road.street ? String(road.street).toLowerCase() : ''; 
          const idStr = String(road.id); 
          if (streetStr.includes(q) || idStr.includes(q)) { 
            if (!savedIds.includes(idStr)) { savedIds.push(idStr); finalResults.push(road); } 
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
    
    handleEdgeSelect(edge) {
      if (this.routing.activeMode) {
        // Acquisizione coordinate per il modulo di Routing
        const mode = this.routing.activeMode;
        if (mode === 'start') this.routing.startPoint = edge;
        else this.routing.endPoint = edge;
        
        this.$refs.mapGraph.setRoutingMarker(edge.uid, mode);
        this.showToast(`Punto ${mode === 'start' ? 'Partenza' : 'Arrivo'} impostato`, 'success');
        
        this.routing.activeMode = null;
        this.$refs.mapGraph.setCursor('grab');
      } else {
        // Ispezione standard arco topografico
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
        this.showToast('Clicca sulla mappa per selezionare la strada', 'warning');
      }
    },

    /**
     * Avvia la risoluzione del percorso minimo (Dijkstra) inoltrando il payload
     * al microservizio Node.js, includendo le decurtazioni topografiche (cantieri).
     */
    async executeDijkstra() {
      if (!this.routing.startPoint || !this.routing.endPoint) return;
      this.showToast('Calcolo percorso in corso tramite Backend...', 'info');
      
      // Estrae dinamicamente le limitazioni dalla mappa
      const closedEdgesArray = this.$refs.mapGraph.getClosedEdgesIds();

      const payload = { 
        start_id: String(this.routing.startPoint.id), 
        end_id: String(this.routing.endPoint.id),
        closed_edges: closedEdgesArray
      };

      console.log("[DSS REST] Payload in invio:", payload);

      try {
        const response = await fetch('http://localhost:3000/api/dijkstra', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success && data.path && data.path.length > 0) {
          this.hasActiveRoute = true;
          this.$refs.mapGraph.drawRoute(data.path);
          const dist = data.metrics?.total_distance_meters ? `${data.metrics.total_distance_meters}m` : 'completata';
          this.showToast(`Percorso ottimale trovato! Distanza: ${dist}`, 'success');
        } else {
          this.showToast('Impossibile trovare un percorso! Rete isolata.', 'warning');
          this.$refs.mapGraph.clearRoute();
          this.hasActiveRoute = false;
        }
      } catch (error) {
        console.error("[DSS Error] Connessione API fallita:", error);
        this.showToast('Errore di comunicazione col server (Backend offline?)', 'error');
      }
    },

    closeSidebar() { this.ui.panelOpen = false; },
    
    softReset() {
      this.routing.startPoint = null; this.routing.endPoint = null; this.routing.activeMode = null;
      this.selectedEdge = null; this.ui.panelOpen = false;
      this.hasActiveRoute = false; 
      this.$refs.mapGraph.setCursor('grab');
      this.$refs.mapGraph.resetAll();
      this.showToast('Scenario resettato istantaneamente', 'success');
    },

    /**
     * Applica alterazioni logico-visive al grafo (cantieri/esclusioni).
     * Innesca un ricalcolo reattivo se incide su un percorso già computato.
     */
    runSimulation(mode) {
      if (!this.selectedEdge) return;
      const newState = !this.selectedEdge.isClosed;
      
      if (mode === 'portion') this.$refs.mapGraph.updateSingleEdgeStyle(this.selectedEdge.uid, newState);
      else if (mode === 'entire') this.$refs.mapGraph.updateGroupStyle(this.selectedEdge.id, newState);
      
      this.selectedEdge = { ...this.selectedEdge, isClosed: newState };
      this.showToast(newState ? 'Strada interrotta al traffico' : 'Strada riaperta', newState ? 'warning' : 'success');

      // Ricalcolo Reattivo (DSS Pattern)
      if (this.hasActiveRoute) {
        this.showToast('Ricalcolo automatico della deviazione...', 'info');
        this.executeDijkstra();
      }
    }
  }
};
</script>

<style>
/* CSS Globale: Font, reset, variabili e Toast */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
:root { --dss-navy: #0f172a; --dss-blue: #2563eb; --header-height: 60px; }
body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; font-family: 'Inter', sans-serif; background: #f1f5f9; }
.dss-main-container { display: flex; flex-direction: column; height: 100vh; position: relative; }

.toast-container { position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); z-index: 9999; display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
.toast { background: #1e293b; color: white; padding: 12px 24px; border-radius: 8px; font-size: 13px; font-weight: 600; box-shadow: 0 10px 25px rgba(0,0,0,0.2); pointer-events: auto; }
.toast-success { border-bottom: 3px solid #10b981; } .toast-warning { border-bottom: 3px solid #f59e0b; } .toast-info { border-bottom: 3px solid #3b82f6; }
.toast-anim-enter-active, .toast-anim-leave-active { transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.toast-anim-enter-from { opacity: 0; transform: translateY(20px) scale(0.9); } .toast-anim-leave-to { opacity: 0; transform: translateY(-20px); }

.dss-header { height: var(--header-height); background: var(--dss-navy); color: white; display: flex; align-items: center; justify-content: space-between; padding: 0 2rem; z-index: 2000; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
.brand { display: flex; align-items: center; font-size: 14px; letter-spacing: 1px; } .brand-bold { font-weight: 800; color: var(--dss-blue); } .brand-separator { margin: 0 10px; opacity: 0.3; }

.header-search-wrapper { flex: 0 1 400px; position: relative; } .search-input-group input { width: 100%; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); padding: 8px 15px; border-radius: 6px; color: white; outline: none; transition: 0.3s; } .search-input-group input:focus { background: white; color: black; }
.search-dropdown { position: absolute; top: 110%; left: 0; right: 0; background: white; border-radius: 6px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); list-style: none; padding: 5px 0; margin: 0; z-index: 3000; overflow: hidden; } .search-dropdown li { padding: 10px 15px; cursor: pointer; color: #333; border-bottom: 1px solid #f1f5f9; display: flex; flex-direction: column; } .search-dropdown li:hover { background: #eff6ff; } .res-street { font-size: 13px; font-weight: 600; } .res-id { font-size: 10px; color: #64748b; margin-top: 2px; }

.header-actions { display: flex; align-items: center; gap: 15px; } .btn-reset-global { background: transparent; color: #94a3b8; border: 1px solid rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 6px; font-weight: 700; font-size: 11px; cursor: pointer; transition: all 0.3s ease; } .btn-reset-global:hover { background: rgba(239, 68, 68, 0.15); color: #ef4444; border-color: #ef4444; } .btn-system { background: var(--dss-blue); color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 700; font-size: 11px; cursor: pointer; }

.dss-viewport { flex: 1; position: relative; }
</style>