<template>
  <div class="single-edge-panel">
    
    <EdgeInfoList 
      :edge="singleEdge" 
      :count="dssStore.selectedEdges.length" 
    />

    <EdgeActionsSingle 
      :isStreetPartiallyClosed="isStreetPartiallyClosed"
      :isSingleEdgeClosed="isSingleEdgeClosed"
      :showSingleEdgeAction="dssStore.selectedEdges.length === 1"
      @toggle-street="handleStreet"
      @toggle-edge="toggleArco(singleEdge.id)"
      @set-weight="impostaPeso"
    />
    
  </div>
</template>

<script>
import { useDssStore } from '../../store/dssStore';
import { useUiStore } from '../../store/uiStore';
import EdgeInfoList from './EdgeInfoList.vue';
import EdgeActionsSingle from './EdgeActionsSingle.vue';

export default {
  name: 'SingleEdgePanel',
  components: {
    EdgeInfoList,
    EdgeActionsSingle
  },
  setup() {
    const dssStore = useDssStore();
    const uiStore = useUiStore();
    return { dssStore, uiStore };
  },
  computed: {
    singleEdge() {
      return this.dssStore.selectedEdges[0] || {};
    },
    isSingleEdgeClosed() { 
      return this.dssStore.activeClosureIds.includes(this.singleEdge.id); 
    },
    isStreetPartiallyClosed() {
      if (!this.singleEdge.street) return false;
      return this.dssStore.allEdges
        .filter(e => e.street === this.singleEdge.street)
        .some(e => this.dssStore.activeClosureIds.includes(e.id));
    }
  },
  methods: {
    toggleArco(id) { 
      this.dssStore.toggleEdgeStatus(id); 
    },
    handleStreet(shouldClose) { 
      this.dssStore.toggleStreetStatus(this.singleEdge.street, shouldClose); 
    },
    impostaPeso() {
      this.uiStore.showToast("Funzionalità Imposta Peso in arrivo nella Next Version!", "info");
    }
  }
}
</script>

<style scoped>
.single-edge-panel { 
  display: flex; 
  flex-direction: column; 
}
</style>