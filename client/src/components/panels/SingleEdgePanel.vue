<template>
  <div class="single-edge-panel">
    <EdgeInfoList 
      :edge="singleEdge" 
      :count="dssStore.selectedEdges.length" 
      :totalLength="totalLength"
    />

    <EdgeActionsSingle 
      :isStreetPartiallyClosed="isStreetPartiallyClosed"
      :isSingleEdgeClosed="isSingleEdgeClosed"
      :showSingleEdgeAction="dssStore.selectedEdges.length === 1"
      :allStreetSegmentsSelected="allStreetSegmentsSelected"
      :isMultiSelection="dssStore.selectedEdges.length > 1"
      @toggle-bulk="handleBulkAction"
      @toggle-edge="toggleArco(singleEdge.id)"
      @set-weight="impostaPeso"
      @select-entire-street="selectEntireStreet"
      @select-single-edge="selectSingleEdge"
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
  components: { EdgeInfoList, EdgeActionsSingle },
  setup() {
    const dssStore = useDssStore();
    const uiStore = useUiStore();
    return { dssStore, uiStore };
  },
  data() { return { originalSingleEdgeId: null }; },
  watch: {
    'dssStore.selectedEdges': {
      immediate: true,
      handler(newVal) {
        if (newVal && newVal.length === 1) this.originalSingleEdgeId = newVal[0].id;
      }
    }
  },
  computed: {
    singleEdge() {
      if (this.dssStore.selectedEdges.length > 1 && this.originalSingleEdgeId) {
        const orig = this.dssStore.selectedEdges.find(e => e.id === this.originalSingleEdgeId);
        if (orig) return orig;
      }
      return this.dssStore.selectedEdges[0] || {};
    },
    totalLength() {
      return this.dssStore.selectedEdges.reduce((sum, edge) => sum + (Number(edge.length) || 0), 0);
    },
    allStreetSegmentsSelected() {
      if (!this.singleEdge.street) return false;
      const totalSegmentsInStreet = this.dssStore.allEdges.filter(e => e.street === this.singleEdge.street).length;
      return this.dssStore.selectedEdges.length === totalSegmentsInStreet;
    },
    isSingleEdgeClosed() { 
      return this.dssStore.activeClosureIds.includes(this.singleEdge.id); 
    },
    isStreetPartiallyClosed() {
      if (!this.singleEdge.street) return false;
      return this.dssStore.selectedEdges.some(e => this.dssStore.activeClosureIds.includes(e.id));
    }
  },
  methods: {
    toggleArco(id) { this.dssStore.toggleEdgeStatus(id); },
    // 🔥 UX FIX: Azione massiva sui tratti selezionati (anche della stessa via)
    async handleBulkAction(shouldClose) {
      this.uiStore.setCalculating(true, "Aggiornamento dei tratti selezionati...");
      try {
        const promises = this.dssStore.selectedEdges.map(edge => {
          const isClosed = this.dssStore.activeClosureIds.includes(edge.id);
          if ((shouldClose && !isClosed) || (!shouldClose && isClosed)) {
            return this.dssStore.toggleEdgeStatus(edge.id);
          }
          return Promise.resolve();
        });
        await Promise.all(promises);
        this.dssStore.clearMapSelection(); // Chiude sidebar e toglie giallo
      } finally {
        this.uiStore.setCalculating(false);
      }
    },
    impostaPeso() { this.uiStore.showToast("🚧 Funzionalità 'Imposta Peso' in lavorazione...", "info"); },
    selectEntireStreet() {
      if (!this.singleEdge.street) return;
      const streetEdges = this.dssStore.allEdges.filter(e => e.street === this.singleEdge.street);
      this.dssStore.processSearchSelect(streetEdges);
    },
    selectSingleEdge() {
      if (this.originalSingleEdgeId) {
        const edge = this.dssStore.allEdges.find(e => e.id === this.originalSingleEdgeId);
        if (edge) this.dssStore.processSearchSelect([edge]);
      }
    }
  }
}
</script>