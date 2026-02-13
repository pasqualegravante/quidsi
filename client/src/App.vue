<template>
  <div id="app" class="dss-main-container">
    
    <header class="dss-header">
      <div class="brand">
        <span class="brand-bold">QUIDSI</span>
        <span class="brand-separator">|</span>
        <span class="brand-sub">SISTEMA DI SUPPORTO DECISIONALE TRENTO</span>
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
 * @component App
 * @description Componente principale (Root) che orchestra il layout dell'applicazione.
 * Gestisce lo stato della UI e il flusso di dati tra la mappa e i pannelli informativi.
 */
import MapGraph from './components/MapGraph.vue';
import Sidebar from './components/Sidebar.vue';
import FullscreenMenu from './components/FullscreenMenu.vue';

export default {
  name: 'App',
  components: {
    MapGraph,
    Sidebar,
    FullscreenMenu
  },
  data() {
    return {
      /** @type {Object|null} Contiene i metadati dell'arco viario selezionato sulla mappa */
      selectedEdge: null,
      
      /** @type {Object} Stato di visibilità dei componenti dell'interfaccia */
      ui: {
        panelOpen: false,
        fullScreenOpen: false
      }
    };
  },
  methods: {
    /**
     * Gestisce la selezione di un arco stradale emessa dal componente MapGraph.
     * @param {Object} edge - Metadati dell'arco (id, via, senso di marcia, ecc.)
     */
    handleEdgeSelect(edge) {
      this.selectedEdge = edge;
      this.ui.panelOpen = true; // Espande automaticamente il pannello laterale al click
    },

    /**
     * Chiude la sidebar e notifica la mappa di rimuovere gli evidenziatori grafici.
     */
    closeSidebar() {
      this.ui.panelOpen = false;
      this.selectedEdge = null;
      // Richiama il metodo di reset interno al componente MapGraph tramite ref
      if (this.$refs.mapGraph) {
        this.$refs.mapGraph.reset();
      }
    },

    /**
     * Ripristina lo stato iniziale dell'applicazione previo conferma dell'utente.
     */
    resetMap() {
      if (confirm("Sei sicuro di voler resettare lo stato della mappa?")) {
        location.reload(); // Reload della pagina per un reset pulito delle istanze Leaflet/JS
      }
    },

    /**
     * Esegue il trigger della simulazione algoritmica (integrazione futura con Python/Node backend).
     */
    runSimulation() {
      console.log("Simulazione avviata per l'arco:", this.selectedEdge.id);
      alert(`Analisi impatto viabilistico avviata per: ${this.selectedEdge.street || 'Arco ' + this.selectedEdge.id}`);
    }
  }
};
</script>

<style>
/**
 * VARIABILI DI STILE E RESET
 * Definizione della palette istituzionale e dei parametri di layout
 */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap');

:root {
  --dss-navy: #0a192f;
  --dss-blue: #004dcf;
  --dss-white: #ffffff;
  --header-height: 50px;
}

body, html {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  font-family: 'Inter', sans-serif;
  overflow: hidden; /* Blocca lo scroll per garantire il layout full-screen della dashboard */
  background-color: #f0f2f5;
}

.dss-main-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  position: relative;
}

/* Design della barra di navigazione superiore */
.dss-header {
  height: var(--header-height);
  background-color: var(--dss-navy);
  color: var(--dss-white);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 25px;
  z-index: 1500; /* Priorità visiva sopra mappa e sidebar */
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.brand {
  display: flex;
  align-items: center;
  font-size: 13px;
  letter-spacing: 1px;
}

.brand-bold {
  font-weight: 800;
}

.brand-separator {
  margin: 0 12px;
  opacity: 0.3;
}

.brand-sub {
  font-weight: 300;
  opacity: 0.8;
}

.btn-system {
  background-color: var(--dss-blue);
  color: white;
  border: none;
  padding: 7px 18px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn-system:hover {
  background-color: #003db3;
}

/* Area di disegno cartografico */
.dss-viewport {
  flex: 1;
  position: relative;
  z-index: 1;
}

/* Offset per il posizionamento della sidebar sotto l'header */
.dss-side-panel {
  top: calc(var(--header-height) + 20px) !important;
}
</style>