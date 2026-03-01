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
          :focusEdgeId="dssStore.mapFocusId"
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
      this.dssStore.selectedEdge = edge;
      this.isRightSidebarOpen = true;
    }
  }
};
</script>

<style>
/* Reset Globale */
html, body { margin: 0; padding: 0; height: 100%; font-family: 'Inter', sans-serif; overflow: hidden; }
.dss-layout { display: flex; flex-direction: column; height: 100vh; }
.dss-main-area { display: flex; flex: 1; overflow: hidden; position: relative; }
.map-container { flex: 1; position: relative; }
</style>