<template>
  <header class="dss-navbar">
    
    <NavbarTitle />

    <div class="navbar-search-area">
      <SearchBar />
    </div>

    <NavbarActions @stampa-report="$emit('stampa-report')" />

  </header>
</template>

<script>
import NavbarTitle from './navbar/NavbarTitle.vue';
import NavbarActions from './navbar/NavbarActions.vue';
import SearchBar from './SearchBar.vue';
import { useDssStore } from '../store/dssStore';

export default {
  name: 'Navbar',
  components: { NavbarTitle, SearchBar, NavbarActions },
  emits: ['stampa-report'],
  setup() {
    const dssStore = useDssStore();
    return { dssStore };
  },
  mounted() {
    // La protezione anti-chiusura accidentale della scheda del browser rimane qui
    window.addEventListener('beforeunload', this.preventAccidentalClose);
  },
  beforeUnmount() {
    window.removeEventListener('beforeunload', this.preventAccidentalClose);
  },
  methods: {
    preventAccidentalClose(e) {
      if (this.dssStore.isModified) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
  }
}
</script>

<style scoped>
.dss-navbar { 
  height: 60px; 
  background: #0f172a; 
  display: flex; 
  align-items: center; 
  justify-content: space-between; 
  padding: 0 20px; 
  color: white; 
  border-bottom: 1px solid #1e293b; 
  z-index: 1000; 
  position: relative; 
}

.navbar-search-area { 
  flex: 1; 
  display: flex; 
  justify-content: center; 
  padding: 0 20px; 
}
</style>