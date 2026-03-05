<template>
  <header class="dss-navbar">
    <div class="navbar-brand" @click="goHome">
      <span class="brand-quidsi">QuidSi</span>
    </div>

    <div class="navbar-search">
      <input 
        type="text" 
        v-model="searchQuery" 
        @input="onSearch"
        placeholder="Cerca una via... (Esempio: via Dante)" 
      />
      <ul v-if="results.length" class="search-results">
        <li v-for="res in results" :key="res.id" @click="selectRoad(res)">
          {{ res.street }} ({{ res.id }})
        </li>
      </ul>
    </div>

    <div class="navbar-actions">
      <button class="action-btn" @click="dssStore.createScenario">
        <span class="icon">📄</span><span class="label">New</span>
      </button>
      <button class="action-btn" @click="printMap">
        <span class="icon">🖨️</span><span class="label">Stampa</span>
      </button>
      <button class="action-btn" @click="dssStore.saveCurrentScenario">
        <span class="icon">💾</span><span class="label">Salva</span>
      </button>
      
      <button class="action-btn" @click="exportScenario">
        <span class="icon">📤</span><span class="label">Export</span>
      </button>
      
      <div class="user-profile">
        <span class="avatar">👤</span>
        <span class="username">Operatore</span>
      </div>
    </div>
  </header>
</template>

<script>
import { useDssStore } from '../store/dssStore';
import { SearchService } from '../services/searchService'; 

export default {
  name: 'Navbar',
  setup() {
    const dssStore = useDssStore();
    return { dssStore };
  },
  data() {
    return {
      searchQuery: '',
      results: []
    }
  },
  watch: {
    // --- NUOVO --- Costruisce l'indice di ricerca appena la mappa carica gli archi nello Store
    'dssStore.allEdges': {
      handler(newEdges) {
        if (newEdges && newEdges.length > 0) {
          SearchService.buildIndex(newEdges);
        }
      },
      immediate: true
    }
  },
  methods: {
    async onSearch() {
      if (this.searchQuery.length > 1) {
        this.results = await SearchService.search(this.searchQuery);
      } else {
        this.results = [];
      }
    },
    
    selectRoad(res) {
      this.searchQuery = res.street;
      this.results = [];
      
      // --- MODIFICATO --- Aggiorna lo store per far zoomare la mappa!
      this.dssStore.mapFocusId = res.id;
      
      // Piccolo trucco per permettere di zoomare due volte di fila sulla stessa via:
      // Svuotiamo la variabile di focus dopo 1 secondo, così il watch della mappa è pronto a scattare di nuovo.
      setTimeout(() => { this.dssStore.mapFocusId = null; }, 1000);
    },
    
    printMap() { window.print(); },
    goHome() { window.location.reload(); },

    // --- NUOVO --- Logica di esportazione del JSON dello scenario attivo
    exportScenario() {
      const scenario = this.dssStore.activeScenario;
      if (!scenario) {
        alert("Nessun scenario attivo da esportare. Selezionane uno dall'archivio.");
        return;
      }
      
      // Converte l'oggetto scenario in una stringa JSON formattata
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(scenario, null, 2));
      const downloadAnchorNode = document.createElement('a');
      
      downloadAnchorNode.setAttribute("href", dataStr);
      // Dà al file il nome dello scenario oppure un nome di default
      downloadAnchorNode.setAttribute("download", (scenario.label ? scenario.label.replace(/\s+/g, '_') : 'scenario') + ".json");
      
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    }
  }
}
</script>

<style scoped>
.dss-navbar { height: 60px; background: #0f172a; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; color: white; border-bottom: 2px solid #1e293b; z-index: 2000; position: relative; }
.brand-quidsi { color: #facc15; font-weight: 900; font-size: 20px; cursor: pointer; }
.navbar-search { position: relative; }
.navbar-search input { width: 400px; padding: 8px 15px; border-radius: 20px; border: none; background: #1e293b; color: white; outline: none; }
.search-results { position: absolute; top: 40px; width: 100%; background: white; color: #333; list-style: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); padding: 0; margin: 0; max-height: 300px; overflow-y: auto; z-index: 3000; }
.search-results li { padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
.search-results li:hover { background: #f8fafc; color: #2563eb; font-weight: bold; }
.navbar-actions { display: flex; align-items: center; gap: 15px; }
.action-btn { background: transparent; border: none; color: white; display: flex; flex-direction: column; align-items: center; cursor: pointer; font-size: 11px; opacity: 0.8; transition: 0.2s; }
.action-btn:hover { opacity: 1; transform: translateY(-2px); }
.action-btn .icon { font-size: 18px; margin-bottom: 3px; }
.user-profile { display: flex; align-items: center; gap: 8px; margin-left: 15px; border-left: 1px solid #334155; padding-left: 15px; }
.avatar { background: #3b82f6; padding: 5px; border-radius: 50%; font-size: 14px; }
.username { font-size: 13px; font-weight: bold; color: #cbd5e1; }
</style>