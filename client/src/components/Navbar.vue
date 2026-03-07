<template>
  <header class="dss-navbar">
    <div class="navbar-section section-left">
      <NavbarTitle />
    </div>
    
    <div class="navbar-section section-center">
      <div class="search-wrapper">
        <SearchBar />
      </div>
    </div>

    <div class="navbar-section section-right">
      <NavbarActions @stampa-report="$emit('stampa-report')" />
    </div>
  </header>
</template>

<script>
import NavbarTitle from './navbar/NavbarTitle.vue';
import NavbarActions from './navbar/NavbarActions.vue';
import SearchBar from './SearchBar.vue';
import { usePreventUnload } from '../composables/usePreventUnload'; 

export default {
  name: 'Navbar',
  components: { NavbarTitle, SearchBar, NavbarActions },
  emits: ['stampa-report'],
  setup() {
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
  justify-content: flex-start; 
  
  padding: 0 20px; 
  color: white; 
  border-bottom: 1px solid #1e293b; 
  z-index: 1000; 
  position: relative; 
}

.navbar-section {
  display: flex;
  align-items: center;
}

.section-left {
  margin-right: 30px; 
}

.section-center {
}

.section-right {
  margin-left: auto; 
}

.search-wrapper {
  width: 380px; 
  background: transparent; 
}
</style>