<template>
  <div id="app-root">
    <div v-if="!dssStore.isAuthenticated" class="auth-wrapper">
      <Login />
    </div>

    <div v-else class="dss-main-layout screen-only">
      <Navbar @stampa-report="handlePrintReport" />

      <div class="dss-content-area">
        <SidebarLeft />
        
        <main class="map-viewport">
          <div v-if="uiStore && uiStore.isCalculating" class="global-overlay">
            <div class="spinner">{{ uiStore.loadingMessage }}</div>
          </div>

          <div class="map-container">
            <MapGraph 
              ref="mapRef"
              :closedEdges="dssStore.activeClosureIds"
              :focusEdgeId="dssStore.mapFocusId"
              :startPoint="dssStore.routingStartPoint"
              :endPoint="dssStore.routingEndPoint"
              :cursor="dssStore.selectionMode ? 'crosshair' : 'grab'"
              :routingPath="dssStore.dijkstraPath" 
              @select-edge="dssStore.processMapClick"
              @clear-selection="dssStore.clearMapSelection"
              @search-select="dssStore.processSearchSelect"
            />
            <MapLegend v-show="!uiStore.isCalculating" />
          </div>

          <SidebarRight :isOpen="uiStore.isRightSidebarOpen" @close="dssStore.clearMapSelection" />
        </main>
      </div>
    </div>

    <ReportTemplate v-if="dssStore.isAuthenticated" class="print-only" />

    <SavePromptModal v-if="dssStore.pendingAction" class="screen-only" />
    <ConfirmDeleteModal 
      class="screen-only"
      :show="uiStore.activeModal === 'deleteScenario'"
      :label="uiStore.modalData?.label"
      @cancel="uiStore.closeModal()"
      @confirm="dssStore.executeGlobalDelete()"
    />
  </div>
</template>

<script>
import Navbar from './components/Navbar.vue';
import SidebarLeft from './components/SidebarLeft.vue';
import SidebarRight from './components/SidebarRight.vue';
import MapGraph from './components/MapGraph.vue';
import MapLegend from './components/MapLegend.vue';
import Login from './components/Login.vue';
import ConfirmDeleteModal from './components/modals/ConfirmDeleteModal.vue';
import SavePromptModal from './components/modals/SavePromptModal.vue';
import ReportTemplate from './components/print/ReportTemplate.vue';
import { useDssStore } from './store/dssStore';
import { useUiStore } from './store/uiStore'; 
import { ref, watch } from 'vue';
import { PrintService } from './services/printService';

export default {
  name: 'App',
  components: { 
    Navbar, SidebarLeft, SidebarRight, MapGraph, MapLegend, 
    Login, ConfirmDeleteModal, SavePromptModal, ReportTemplate 
  },
  setup() {
    const dssStore = useDssStore();
    const uiStore = useUiStore();
    const mapRef = ref(null);

    watch(() => dssStore.isAuthenticated, async (isAuth) => {
      if (isAuth) {
        await dssStore.fetchAllScenarios();
        if (!dssStore.activeScenario) {
          if (dssStore.scenarios && dssStore.scenarios.length > 0) {
            await dssStore.selectScenario(dssStore.scenarios[0].id);
          } else {
            await dssStore.createScenario();
          }
        }
      }
    }, { immediate: true });

    const handlePrintReport = async () => { await PrintService.executePrint(mapRef.value, '.map-container'); };
    return { dssStore, uiStore, mapRef, handlePrintReport };
  }
};
</script>

<style>
/* CSS di base */
html, body { margin: 0; padding: 0; height: 100%; font-family: 'Inter', sans-serif; overflow: hidden; }
.dss-main-layout { display: flex; flex-direction: column; height: 100vh; }
.dss-content-area { display: flex; flex: 1; overflow: hidden; position: relative; }
.map-viewport { flex: 1; position: relative; overflow: hidden; display: flex; flex-direction: column; }
.map-container { flex: 1; position: relative; z-index: 1; background: #e2e8f0; }
.global-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.7); display: flex; justify-content: center; align-items: center; z-index: 9999; color: white; }

/* ------------------------------------------- */
/* 🖨️ MAGIA DELLA STAMPA (SWAP DISPLAY)        */
/* ------------------------------------------- */
@media screen {
  .print-only { display: none !important; }
}

@media print {
  @page {
    size: A4 portrait; /* Impostiamo il formato standard A4 */
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