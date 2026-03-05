<template>
  <div id="app-root">
    <div class="dss-layout screen-only">
      <div v-if="uiStore && uiStore.isCalculating" class="global-overlay">
        <div class="spinner">Calcolo in corso...</div>
      </div>
      
      <Login v-if="!dssStore.isAuthenticated" />

      <template v-else>
        <Navbar @stampa-report="handlePrintReport" />

        <main class="dss-main-area">
          <SidebarLeft />

          <div class="map-container">
            <MapGraph 
              ref="mapRef"
              :closedEdges="dssStore.activeClosureIds"
              :focusEdgeId="dssStore.mapFocusId"
              :cursor="dssStore.selectionMode ? 'crosshair' : 'grab'"
              @select-edge="dssStore.processMapClick"
              @clear-selection="dssStore.clearMapSelection"
              @search-select="dssStore.processSearchSelect"
            />
            <MapLegend />
          </div>

          <SidebarRight 
            :isOpen="uiStore.isRightSidebarOpen" 
            @close="uiStore.setRightSidebar(false)"
          />
        </main>
        
        <SavePromptModal v-if="uiStore.activeModal === 'savePrompt'" />
        
        <ConfirmDeleteModal 
          v-if="uiStore.activeModal === 'deleteScenario'"
          :show="true" 
          :label="uiStore.modalData?.label"
          @cancel="uiStore.closeModal"
          @confirm="dssStore.executeGlobalDelete"
        />
      </template>
    </div>

    <ReportTemplate v-if="dssStore.isAuthenticated" />
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
import html2canvas from 'html2canvas';
import { ref } from 'vue';

export default {
  name: 'App',
  components: { 
    Navbar, SidebarLeft, SidebarRight, MapGraph, MapLegend, Login, 
    ConfirmDeleteModal, SavePromptModal, ReportTemplate 
  },
  setup() {
    const dssStore = useDssStore();
    const uiStore = useUiStore();
    const mapRef = ref(null);

    const handlePrintReport = async () => {
      const mapElement = document.querySelector('.map-container');
      try {
        uiStore.setCalculating(true);

        // 1. Zoom intelligente: Chiusure + Percorso
        if (mapRef.value) {
          mapRef.value.fitToReportContent();
          await new Promise(r => setTimeout(r, 1000));
        }
        
        // 2. Snapshot
        if (mapElement) {
          const canvas = await html2canvas(mapElement, {
            useCORS: true, 
            backgroundColor: null
          });
          uiStore.setMapSnapshot(canvas.toDataURL('image/png'));
        }

        window.print();
      } catch (e) {
        console.error("Errore report:", e);
      } finally {
        uiStore.setCalculating(false);
      }
    };

    return { dssStore, uiStore, mapRef, handlePrintReport };
  }
};
</script>

<style>
html, body { margin: 0; padding: 0; height: 100%; font-family: 'Inter', sans-serif; overflow: hidden; }
.dss-layout { display: flex; flex-direction: column; height: 100vh; }
.dss-main-area { display: flex; flex: 1; overflow: hidden; position: relative; }
.map-container { flex: 1; position: relative; background: #e2e8f0; }

.global-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(15, 23, 42, 0.7); display: flex; justify-content: center;
  align-items: center; z-index: 9999; color: white; font-weight: bold;
}

@media screen { .print-only-layout { display: none !important; } }
@media print {
  body { background: white; overflow: visible !important; }
  .screen-only { display: none !important; }
  .print-only-layout { display: block !important; }
  @page { margin: 1cm; }
}
</style>