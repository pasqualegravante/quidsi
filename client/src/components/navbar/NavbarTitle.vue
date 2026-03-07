<template>
  <div class="navbar-left-area">
    <div class="brand-wrapper" @click="goHome" title="Torna alla Home">
      <span class="brand-text">Quidsi</span>
    </div>
  </div>
</template>

<script>
import { useDssStore } from '../../store/dssStore';

export default {
  name: 'NavbarTitle',
  setup() {
    const dssStore = useDssStore();
    return { dssStore };
  },
  methods: {
    goHome() {
      // Se ci sono modifiche non salvate, chiede conferma prima di ricaricare
      if (this.dssStore.isModified && !confirm("Attenzione: hai modifiche non salvate. Sei sicuro di voler uscire e tornare alla Home?")) return;
      window.location.reload();
    }
  }
}
</script>

<style scoped>
.navbar-left-area {
  display: flex;
  align-items: center;
  width: max-content;
  margin: 0;
  padding: 0;
}

.brand-wrapper {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.brand-text {
  font-size: 22px; 
  font-weight: 900;
  color: #fbbf24; 
  white-space: nowrap; 
  margin: 0; 
  padding: 0;
}
</style>