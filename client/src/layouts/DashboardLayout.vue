<template>
  <div class="dss-main-layout screen-only">
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
</template>

<script>
import Navbar from '../components/Navbar.vue';
import SidebarLeft from '../components/SidebarLeft.vue';
import SidebarRight from '../components/SidebarRight.vue';
import MapGraph from '../components/MapGraph.vue';
import MapLegend from '../components/MapLegend.vue';

import { useDssStore } from '../store/dssStore';
import { useUiStore } from '../store/uiStore'; 
import { ref, onMounted } from 'vue';
import { PrintService } from '../services/printService';

export default {
  name: 'DashboardLayout',
  components: { Navbar, SidebarLeft, SidebarRight, MapGraph, MapLegend },
  setup() {
    const dssStore = useDssStore();
    const uiStore = useUiStore();
    const mapRef = ref(null);

    // 🔥 La logica di caricamento iniziale si sposta qui: 
    // ha senso caricare gli scenari solo quando si entra nella dashboard
    onMounted(async () => {
      await dssStore.fetchAllScenarios();
      if (!dssStore.activeScenario) {
        if (dssStore.scenarios && dssStore.scenarios.length > 0) {
          await dssStore.selectScenario(dssStore.scenarios[0].id);
        } else {
          await dssStore.createScenario();
        }
      }
    });

    const handlePrintReport = async () => { 
      await PrintService.executePrint(mapRef.value, '.map-container'); 
    };
    
    return { dssStore, uiStore, mapRef, handlePrintReport };
  }
};
</script>