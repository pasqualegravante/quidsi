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
import { usePreventUnload } from '../composables/usePreventUnload'; // 🔥 Composable

export default {
  name: 'Navbar',
  components: { NavbarTitle, SearchBar, NavbarActions },
  emits: ['stampa-report'],
  setup() {
    // 🔥 Deleghiamo il blocco tab browser al composable. Componente pulitissimo!
    usePreventUnload(); 
    return {};
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