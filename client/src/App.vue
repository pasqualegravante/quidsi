<template>
  <div id="app" class="dss-main-container">
    
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
            placeholder="🔍 Cerca strada (es. Piazza Duomo) o ID..."
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
        <button class="btn-system" @click="ui.fullScreenOpen = true">
          GESTIONE SISTEMA
        </button>
      </div>
    </header>

    <main class="dss-viewport">
      <MapGraph 
        ref="mapGraph" 
        @select-edge="handleEdgeSelect" 
        @graph-loaded="handleGraphLoaded"
      />
    </main>

    <Sidebar 
      :isOpen="ui.panelOpen" 
      :selectedEdge="selectedEdge"
      @close="closeSidebar"
      @simulate="runSimulation"
      @clear="resetMap"
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
 * Agisce da Single Source of Truth per lo stato dell'interfaccia e orchestra 
 * la comunicazione tra il motore GIS (MapGraph), l'interfaccia tecnica (Sidebar)
 * e il sistema di ricerca globale.
 */

import MapGraph from './components/MapGraph.vue';
import Sidebar from './components/Sidebar.vue';
import FullscreenMenu from './components/FullscreenMenu.vue';

export default {
  name: 'App',
  components: { MapGraph, Sidebar, FullscreenMenu },
  data() {
    return {
      /** @type {Object|null} Metadati dell'arco viario attualmente selezionato per l'analisi */
      selectedEdge: null,
      
      /** @type {Array<Object>} Dataset strutturato di tutti gli archi caricati dal GeoJSON (usato per la ricerca in memoria) */
      roadList: [], 
      
      /** @type {String} Query di ricerca inserita dall'operatore tecnico */
      searchQuery: '',
      
      /** @type {Array<Object>} Risultati filtrati e deduplicati pronti per il rendering nel dropdown */
      searchResults: [],
      
      /** @type {Number|null} Riferimento al timeout per il debounce della ricerca spaziale */
      searchTimeout: null,
      
      /** @type {Object} Stato reattivo di visibilità dei pannelli UI */
      ui: { 
        panelOpen: false, 
        fullScreenOpen: false 
      }
    };
  },
  methods: {
    /**
     * Esegue la ricerca testuale o numerica sul dataset delle strade.
     * Implementa tecniche di Debouncing (200ms) per evitare lag di UI e 
     * una logica di deduplicazione per gestire frammentazioni spaziali dello stesso toponimo.
     */
    handleSearch() {
      clearTimeout(this.searchTimeout); // Reset del timer di debounce
      
      if (this.searchQuery.length < 2) {
        this.searchResults = [];
        return;
      }

      this.searchTimeout = setTimeout(() => {
        const q = this.searchQuery.toLowerCase();
        
        const finalResults = [];
        const savedIds = []; // Buffer per tracciare l'unicità degli archi

        for (const road of this.roadList) {
          const streetStr = road.street ? String(road.street).toLowerCase() : '';
          const idStr = road.id ? String(road.id).toLowerCase() : '';

          // Operazione di match parziale su nome strada o ID arco
          if (streetStr.includes(q) || idStr.includes(q)) {
            
            // Deduplicazione: impedisce di mostrare N frammenti con lo stesso ID di sistema
            if (!savedIds.includes(road.id)) {
              savedIds.push(road.id);       
              finalResults.push(road);      
            }
          }

          // Hard limit per garantire rendering a 60fps del dropdown
          if (finalResults.length >= 8) break;
        }

        this.searchResults = finalResults;
      }, 200);
    },
    
    /**
     * Centralizza la vista della mappa su un arco specifico.
     * @param {Number|String} id - Identificativo primario dell'arco nel DB GIS.
     */
    selectRoad(id) {
      this.$refs.mapGraph.zoomToEdge(id);
      this.searchQuery = ''; 
      this.searchResults = []; 
    },

    /**
     * Handler per la selezione di un arco avvenuta interagendo direttamente con il layer cartografico.
     * @param {Object} edge - Feature object estratto dal GeoJSON.
     */
    handleEdgeSelect(edge) {
      this.selectedEdge = edge;
      this.ui.panelOpen = true; // Trigger dell'apertura della Sidebar
    },

    /**
     * Popola l'indice di ricerca in memoria una volta che Leaflet ha processato il file spaziale.
     * @param {Array} list - Lista appiattita degli attributi stradali.
     */
    handleGraphLoaded(list) {
      this.roadList = list; 
    },

    /** Chiude la Sidebar operativa e notifica la mappa di rimuovere l'highlight */
    closeSidebar() {
      this.ui.panelOpen = false;
      this.selectedEdge = null;
      if (this.$refs.mapGraph) this.$refs.mapGraph.reset();
    },

    /** Esegue un hard-reset dell'ambiente simulativo previo consenso dell'operatore */
    resetMap() {
      if (confirm("Sei sicuro di voler resettare lo scenario della mappa?")) {
        location.reload();
      }
    },

    /** * Entry-point per l'algoritmo di routing (Dijkstra) via IPC.
     * In futuro, questo invierà un payload Axios/Fetch al backend Node.js.
     */
    runSimulation() {
      alert(`Simulazione inviata al backend per l'arco ID: ${this.selectedEdge.id}`);
    }
  }
};
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');

:root {
  --dss-navy: #0f172a;
  --dss-blue: #2563eb;
  --header-height: 60px;
}

body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; font-family: 'Inter', sans-serif; background: #f1f5f9; }

.dss-main-container { display: flex; flex-direction: column; height: 100vh; }

.dss-header {
  height: var(--header-height); background: var(--dss-navy); color: white;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 2rem; z-index: 2000; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
}

.brand { display: flex; align-items: center; font-size: 14px; letter-spacing: 1px; }
.brand-bold { font-weight: 800; color: var(--dss-blue); }
.brand-separator { margin: 0 10px; opacity: 0.3; }

/* STILE RICERCA NELL'HEADER */
.header-search-wrapper { flex: 0 1 400px; position: relative; }
.search-input-group input {
  width: 100%; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
  padding: 8px 15px; border-radius: 6px; color: white; outline: none; transition: 0.3s;
}
.search-input-group input:focus { background: white; color: black; }

.search-dropdown {
  position: absolute; top: 110%; left: 0; right: 0; background: white;
  border-radius: 6px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); list-style: none;
  padding: 5px 0; margin: 0; z-index: 3000; overflow: hidden;
}
.search-dropdown li { padding: 10px 15px; cursor: pointer; color: #333; border-bottom: 1px solid #f1f5f9; display: flex; flex-direction: column; }
.search-dropdown li:hover { background: #eff6ff; }
.res-street { font-size: 13px; font-weight: 600; }
.res-id { font-size: 10px; color: #64748b; margin-top: 2px; }

.btn-system { background: var(--dss-blue); color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 700; cursor: pointer; }
.dss-viewport { flex: 1; position: relative; }
</style>