<template>
  <div id="app-root">
    
    <div class="dss-layout screen-only">
      <div v-if="uiStore && uiStore.isCalculating" class="global-overlay">
        <div class="spinner">Generazione Documento Ufficiale...</div>
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
              :startPoint="dssStore.routingStartPoint"
              :endPoint="dssStore.routingEndPoint"
              :cursor="dssStore.selectionMode ? 'crosshair' : 'grab'"
              :routingPath="mockDijkstraPath" 
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
import { ref, computed, watch } from 'vue';

// Importiamo il nuovo servizio modulare
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

    // MOCK DATA: Percorso finto per testare la stampa del verde (in attesa del backend)
    const mockDijkstraPath = computed(() => {
      // In futuro sostituirai questo con: return dssStore.calculatedPathLatLngs || [];
      return [
        [46.0665, 11.1216],
        [46.0672, 11.1228],
        [46.0680, 11.1210]
      ];
    });

    // AUTO-SCENARIO: Non appena l'utente entra, carichiamo un ambiente di lavoro
    watch(() => dssStore.isAuthenticated, async (isAuth) => {
      if (isAuth && !dssStore.activeScenario) {
        // Se ci sono scenari salvati (es. i mock in scenarioService.js), prendiamo il primo
        if (dssStore.scenarios && dssStore.scenarios.length > 0) {
          await dssStore.selectScenario(dssStore.scenarios[0].id);
        } else {
          // Altrimenti ne creiamo uno nuovo per farlo iniziare subito a lavorare
          await dssStore.createScenario();
        }
      }
    }, { immediate: true });

    // FUNZIONE SNELLITA: L'orchestrazione è delegata al servizio
    const handlePrintReport = async () => {
      await PrintService.executePrint(mapRef.value, '.map-container');
    };

    return { 
      dssStore, 
      uiStore, 
      mapRef, 
      handlePrintReport, 
      mockDijkstraPath 
    };
  }
};
</script>

<style>
/* CSS BASE E LAYOUT GLOBALE */
html, body { margin: 0; padding: 0; height: 100%; font-family: 'Inter', sans-serif; overflow: hidden; }
.dss-layout { display: flex; flex-direction: column; height: 100vh; }
.dss-main-area { display: flex; flex: 1; overflow: hidden; position: relative; }
.map-container { flex: 1; position: relative; background: #e2e8f0; }

.global-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(15, 23, 42, 0.7); display: flex; justify-content: center;
  align-items: center; z-index: 9999; color: white; font-weight: bold;
}

/* ------------------------------------------- */
/* MAGIA DELLA STAMPA (CSS PRINT SWAP)         */
/* ------------------------------------------- */

/* SU SCHERMO: Nascondi il report cartaceo */
@media screen {
  .print-only-layout {
    display: none !important;
  }
}

/* SU CARTA: Nascondi l'interfaccia e mostra il report */
@media print {
  body { 
    background: white; 
    overflow: visible !important; 
  }
  .screen-only { 
    display: none !important; 
  }
  .print-only-layout { 
    display: block !important; 
  }
  @page { margin: 1cm; }
}
</style>