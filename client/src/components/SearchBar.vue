<template>
  <div class="search-container">
    <input 
      type="text" 
      v-model="searchQuery" 
      @input="onSearch"
      placeholder="Cerca una via... (Esempio: via Dante)" 
      class="search-input"
    />
    <ul v-if="results.length" class="search-results">
      <li v-for="res in results" :key="res.id" @click="selectRoad(res)">
        {{ res.street }} ({{ res.id }})
      </li>
    </ul>
  </div>
</template>

<script>
import { useDssStore } from '../store/dssStore';
import { SearchService } from '../services/searchService'; 

export default {
  name: 'SearchBar',
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
    // Costruisce l'indice di ricerca appena la mappa carica gli archi nello Store
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
      
      // Aggiorna lo store per far zoomare la mappa
      this.dssStore.mapFocusId = res.id;
      
      // Piccolo trucco per permettere di zoomare due volte di fila sulla stessa via:
      setTimeout(() => { this.dssStore.clearMapFocus(); }, 1000);
    }
  }
}
</script>

<style scoped>
.search-container { 
  position: relative; 
  width: 400px;
}
.search-input { 
  width: 100%; 
  padding: 8px 15px; 
  border-radius: 20px; 
  border: none; 
  background: #1e293b; 
  color: white; 
  outline: none; 
  box-sizing: border-box;
  font-family: 'Inter', sans-serif;
}
.search-input::placeholder {
  color: #94a3b8;
}
.search-input:focus {
  background: #334155;
}
.search-results { 
  position: absolute; 
  top: 40px; 
  left: 0;
  width: 100%; 
  background: white; 
  color: #333; 
  list-style: none; 
  border-radius: 8px; 
  box-shadow: 0 4px 12px rgba(0,0,0,0.2); 
  padding: 0; 
  margin: 0; 
  max-height: 300px; 
  overflow-y: auto; 
  z-index: 3000; 
}
.search-results li { 
  padding: 10px 15px; 
  cursor: pointer; 
  border-bottom: 1px solid #f1f5f9; 
  font-size: 13px; 
}
.search-results li:hover { 
  background: #f8fafc; 
  color: #2563eb; 
  font-weight: bold; 
}
</style>