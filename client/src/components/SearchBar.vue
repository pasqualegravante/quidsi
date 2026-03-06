<template>
  <div class="search-container" ref="searchContainer">
    <input 
      type="text" 
      v-model="searchQuery" 
      @input="onSearch"
      @keydown.down.prevent="navigateDown"
      @keydown.up.prevent="navigateUp"
      @keydown.enter.prevent="selectHighlighted"
      placeholder="Cerca una via... (Esempio: via Dante)" 
      class="search-input"
    />
    <ul v-if="showDropdown && results.length" class="search-results">
      <li 
        v-for="(res, index) in results" 
        :key="res.id" 
        :class="{ 'highlighted': index === selectedIndex }"
        @click="selectRoad(res)"
        @mouseover="selectedIndex = index"
      >
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
      results: [],
      showDropdown: false,
      selectedIndex: -1 // -1 significa niente selezionato
    }
  },
  watch: {
    'dssStore.allEdges': {
      handler(newEdges) {
        if (newEdges && newEdges.length > 0) SearchService.buildIndex(newEdges);
      },
      immediate: true
    }
  },
  mounted() {
    // Aggiunge l'ascoltatore per il click outside quando il componente nasce
    document.addEventListener('click', this.handleClickOutside);
  },
  beforeUnmount() {
    // Rimuove l'ascoltatore per evitare memory leaks
    document.removeEventListener('click', this.handleClickOutside);
  },
  methods: {
    async onSearch() {
      if (this.searchQuery.length > 1) {
        this.results = await SearchService.search(this.searchQuery);
        this.showDropdown = true;
        this.selectedIndex = -1; // Resetta la selezione da tastiera
      } else {
        this.results = [];
        this.showDropdown = false;
      }
    },
    
    // 🔥 UX FIX: Navigazione da tastiera
    navigateDown() {
      if (this.showDropdown && this.selectedIndex < this.results.length - 1) {
        this.selectedIndex++;
      }
    },
    navigateUp() {
      if (this.showDropdown && this.selectedIndex > 0) {
        this.selectedIndex--;
      }
    },
    selectHighlighted() {
      if (this.showDropdown && this.selectedIndex >= 0 && this.results[this.selectedIndex]) {
        this.selectRoad(this.results[this.selectedIndex]);
      }
    },

    // 🔥 UX FIX: Chiudi se si clicca fuori
    handleClickOutside(event) {
      if (this.$refs.searchContainer && !this.$refs.searchContainer.contains(event.target)) {
        this.showDropdown = false;
      }
    },

    selectRoad(res) {
      this.searchQuery = res.street;
      this.showDropdown = false; // Nascondi la tendina
      
      this.dssStore.mapFocusId = res.id;
      setTimeout(() => { this.dssStore.clearMapFocus(); }, 1000);
    }
  }
}
</script>

<style scoped>
.search-container { position: relative; width: 400px; }
.search-input { width: 100%; padding: 8px 15px; border-radius: 20px; border: none; background: #1e293b; color: white; outline: none; box-sizing: border-box; font-family: 'Inter', sans-serif; }
.search-input::placeholder { color: #94a3b8; }
.search-input:focus { background: #334155; }
.search-results { position: absolute; top: 100%; left: 0; right: 0; background: white; border-radius: 8px; margin-top: 5px; padding: 0; list-style: none; box-shadow: 0 4px 15px rgba(0,0,0,0.1); max-height: 300px; overflow-y: auto; z-index: 3000; }
.search-results li { padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #f1f5f9; color: #334155; font-size: 13px; transition: background 0.1s; }
.search-results li:last-child { border-bottom: none; }

/* Stile per l'elemento evidenziato da mouse o tastiera */
.search-results li.highlighted, 
.search-results li:hover { background: #e2e8f0; font-weight: bold; color: #0f172a; }
</style>