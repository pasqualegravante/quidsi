<template>
  <div class="search-container" ref="searchContainer">
    <div class="input-wrapper">
      <span class="search-icon">🔍</span>
      <input 
        type="text" 
        v-model="searchQuery" 
        @input="onSearch"
        @keydown.down.prevent="navigateDown"
        @keydown.up.prevent="navigateUp"
        @keydown.enter.prevent="selectHighlighted"
        placeholder="Cerca una via (es. Via Roma)..." 
        class="search-input"
      />
    </div>
    <ul v-if="showDropdown && results.length" class="search-results">
      <li 
        v-for="(res, index) in results" 
        :key="res.id" 
        :class="{ 'highlighted': index === selectedIndex }"
        @click="selectRoad(res)"
        @mouseover="selectedIndex = index"
      >
        <span class="street-name">{{ res.street }}</span>
        <span class="street-id">ID: {{ res.id }}</span>
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
      selectedIndex: -1
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
    document.addEventListener('click', this.handleClickOutside);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside);
  },
  methods: {
    async onSearch() {
      if (this.searchQuery.length > 1) {
        this.results = await SearchService.search(this.searchQuery);
        this.showDropdown = true;
        this.selectedIndex = -1; 
      } else {
        this.results = [];
        this.showDropdown = false;
      }
    },
    navigateDown() {
      if (this.showDropdown && this.selectedIndex < this.results.length - 1) this.selectedIndex++;
    },
    navigateUp() {
      if (this.showDropdown && this.selectedIndex > 0) this.selectedIndex--;
    },
    selectHighlighted() {
      if (this.showDropdown && this.selectedIndex >= 0 && this.results[this.selectedIndex]) {
        this.selectRoad(this.results[this.selectedIndex]);
      }
    },
    handleClickOutside(event) {
      if (this.$refs.searchContainer && !this.$refs.searchContainer.contains(event.target)) {
        this.showDropdown = false;
      }
    },
    selectRoad(res) {
      this.searchQuery = res.street;
      this.showDropdown = false; 
      this.dssStore.mapFocusId = res.id;
      setTimeout(() => { this.dssStore.clearMapFocus(); }, 1000);
    }
  }
}
</script>

<style scoped>
.search-container { 
  position: relative; 
  width: 380px; /* Leggermente più larga per leggibilità */
  max-width: 90vw; /* Sicurezza per schermi molto piccoli */
}
.input-wrapper { display: flex; align-items: center; background: white; border-radius: 8px; padding: 0 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); border: 1px solid #e2e8f0; }
.search-icon { font-size: 16px; margin-right: 10px; opacity: 0.6; }
.search-input { width: 100%; padding: 14px 0; border: none; background: transparent; color: #0f172a; outline: none; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: bold;}
.search-input::placeholder { color: #94a3b8; font-weight: normal; }

.search-results { position: absolute; top: 100%; left: 0; right: 0; background: white; border-radius: 8px; margin-top: 8px; padding: 0; list-style: none; box-shadow: 0 10px 25px rgba(0,0,0,0.15); border: 1px solid #e2e8f0; max-height: 300px; overflow-y: auto; z-index: 3000; }
.search-results li { padding: 12px 15px; cursor: pointer; border-bottom: 1px solid #f1f5f9; font-size: 13px; transition: background 0.1s; display: flex; justify-content: space-between; align-items: center; }
.search-results li:last-child { border-bottom: none; }
.street-name { font-weight: bold; color: #1e293b; }
.street-id { font-size: 11px; color: #94a3b8; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }

.search-results li.highlighted, 
.search-results li:hover { background: #f8fafc; }
.search-results li.highlighted .street-name, 
.search-results li:hover .street-name { color: #3b82f6; }
</style>