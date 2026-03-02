<template>
  <div id="app" class="dss-layout">
    <div v-if="uiStore.isCalculating" class="global-overlay">
      <div class="spinner">Calcolo in corso...</div>
    </div>
    
    <Navbar />

    <main class="dss-main-area">
      <SidebarLeft />

      <div class="map-container">
        <MapGraph 
          :closedEdges="dssStore.activeClosureIds"
          @select-edge="handleEdgeSelect"
        />
        <MapLegend :connectedComponents="dssStore.connectedComponents" />
      </div>

      <SidebarRight 
        :isOpen="isRightSidebarOpen" 
        :selectedEdge="dssStore.selectedEdge"
        @close="isRightSidebarOpen = false"
      />
    </main>
  </div>
</template>

<script>
import Navbar from './components/Navbar.vue';
import SidebarLeft from './components/SidebarLeft.vue';
import SidebarRight from './components/SidebarRight.vue';
import MapGraph from './components/MapGraph.vue';
import MapLegend from './components/MapLegend.vue';
import { useDssStore } from './store/dssStore';
import { uiStore } from './store/uiStore';

export default {
  name: 'App',
  components: { Navbar, SidebarLeft, SidebarRight, MapGraph, MapLegend },
  setup() {
    const dssStore = useDssStore();
    return { dssStore, uiStore };
  },
  data() {
    return {
      isRightSidebarOpen: false
    }
  },
  methods: {
    handleEdgeSelect(edge) {
      // 1. Memorizza l'arco selezionato nello Store globale
      this.dssStore.selectedEdge = edge;
      // 2. Attiva la visibilità della sidebar destra [cite: 382]
      this.isRightSidebarOpen = true;
    }
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
  align-items: center; z-index: 9999; color: white;
}
</style>