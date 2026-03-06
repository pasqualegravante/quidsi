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
      @toggle-street="handleStreet"
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
  data() {
    return { originalSingleEdgeId: null };
  },
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
      return this.dssStore.allEdges
        .filter(e => e.street === this.singleEdge.street)
        .some(e => this.dssStore.activeClosureIds.includes(e.id));
    }
  },
  methods: {
    toggleArco(id) { 
      this.dssStore.toggleEdgeStatus(id); 
      // Nota: Non deselezioniamo sul singolo tratto, così l'utente può continuare a lavorarci su!
    },
    // 🔥 UX FIX: Azione massiva con Auto-Deselect e Spinner
    async handleStreet(closeAll) {
      this.uiStore.setCalculating(true, "Sincronizzazione topologica dell'intera via...");
      try {
        await this.dssStore.toggleStreetStatus(this.singleEdge.street, closeAll);
        // Svuota la selezione: fa sparire il giallo, mostra il rosso/verde e chiude la sidebar!
        this.dssStore.clearMapSelection(); 
      } finally {
        this.uiStore.setCalculating(false);
      }
    },
    impostaPeso() {
      this.uiStore.showToast("🚧 Funzionalità 'Imposta Peso' in lavorazione (WIP)...", "info");
    },
    selectEntireStreet() {
      if (!this.singleEdge.street) return;
      const streetEdges = this.dssStore.allEdges.filter(e => e.street === this.singleEdge.street);
      this.dssStore.processSearchSelect(streetEdges);
    },
    selectSingleEdge() {
      if (this.originalSingleEdgeId) {
        const edgeToRestore = this.dssStore.allEdges.find(e => e.id === this.originalSingleEdgeId);
        if (edgeToRestore) {
          this.dssStore.processSearchSelect([edgeToRestore]);
          return;
        }
      }
      if (this.dssStore.selectedEdges.length > 0) {
        this.dssStore.processSearchSelect([this.dssStore.selectedEdges[0]]);
      }
    }
  }
}
</script>