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
      <button class="action-btn">
        <span class="icon">📤</span><span class="label">Export</span>
      </button>
      <div class="operator-profile">
        <span class="icon">👤</span><span class="label">Operator</span>
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
    return { searchQuery: '', results: [] };
  },
  methods: {
    async onSearch() {
      if (this.searchQuery.length > 2) {
        this.results = await SearchService.search(this.searchQuery);
      } else {
        this.results = [];
      }
    },
    selectRoad(road) {
      this.dssStore.mapFocusId = road.id; 
      this.searchQuery = road.street;
      this.results = [];
    },
    printMap() { window.print(); },
    goHome() { window.location.reload(); }
  }
}
</script>

<style scoped>
.dss-navbar { height: 60px; background: #0f172a; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; color: white; border-bottom: 2px solid #1e293b; z-index: 2000; position: relative; }
.brand-quidsi { color: #facc15; font-weight: 900; font-size: 20px; cursor: pointer; }
.navbar-search { position: relative; }
.navbar-search input { width: 400px; padding: 8px 15px; border-radius: 20px; border: none; background: #1e293b; color: white; outline: none; }
.search-results { position: absolute; top: 40px; width: 100%; background: white; color: #333; list-style: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); padding: 0; margin: 0; max-height: 300px; overflow-y: auto; z-index: 3000; }
.search-results li { padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #eee; font-size: 13px; font-weight: bold; }
.search-results li:hover { background: #f1f5f9; color: #2563eb; }
.navbar-actions { display: flex; gap: 15px; }
.action-btn { background: none; border: none; color: white; cursor: pointer; display: flex; flex-direction: column; align-items: center; font-size: 10px; opacity: 0.8;}
.action-btn:hover { opacity: 1; color: #facc15; }
.operator-profile { display: flex; gap: 8px; align-items: center; margin-left: 20px; padding-left: 20px; border-left: 1px solid #334155; }
</style>