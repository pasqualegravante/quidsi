<template>
  <div id="app-root">
    
    <div v-if="!dssStore.isAuthenticated" class="auth-wrapper">
      <Login />
    </div>

    <DashboardLayout v-else />

    <ReportTemplate v-if="dssStore.isAuthenticated" class="print-only" />

    <GlobalModals v-if="dssStore.isAuthenticated" />

  </div>
</template>

<script>
import Login from './components/Login.vue';
import DashboardLayout from './layouts/DashboardLayout.vue';
import ReportTemplate from './components/print/ReportTemplate.vue'; // 🔥 Path aggiornato
import GlobalModals from './components/modals/GlobalModals.vue'; 

import { useDssStore } from './store/dssStore';

export default {
  name: 'App',
  components: { 
    Login, DashboardLayout, ReportTemplate, GlobalModals 
  },
  setup() {
    const dssStore = useDssStore();
    return { dssStore };
  }
};
</script>

<style>
/* CSS globale base: Reset e typography */
html, body { margin: 0; padding: 0; height: 100%; font-family: 'Inter', sans-serif; overflow: hidden; }
#app-root { height: 100%; width: 100%; }

/* Struttura condivisa del layout */
.dss-main-layout { display: flex; flex-direction: column; height: 100vh; }
.dss-content-area { display: flex; flex: 1; overflow: hidden; position: relative; }
.map-viewport { flex: 1; position: relative; overflow: hidden; display: flex; flex-direction: column; }
.map-container { flex: 1; position: relative; z-index: 1; background: #e2e8f0; }
.global-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.7); display: flex; justify-content: center; align-items: center; z-index: 9999; color: white; }

/* ------------------------------------------- */
/* 🖨️ GESTIONE DISPLAY SCHERMO/STAMPA          */
/* ------------------------------------------- */
@media screen {
  .print-only { display: none !important; }
}

@media print {
  @page {
    size: A4 portrait;
    margin: 1cm;
  }
  
  body, html {
    background: white !important;
    height: auto !important;
    overflow: visible !important;
  }

  .screen-only { display: none !important; }
  .print-only { display: block !important; }
}
</style>