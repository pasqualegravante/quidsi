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
  computed: {
    singleEdge() {
      return this.dssStore.selectedEdges[0] || {};
    },
    // 🔥 SOMMA DELLE LUNGHEZZE
    totalLength() {
      return this.dssStore.selectedEdges.reduce((sum, edge) => sum + (Number(edge.length) || 0), 0);
    },
    // Controllo per nascondere il bottone se ho già selezionato tutto
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
      this.dssStore.toggleEdgeStatus(this.dssStore.uid, this.dssStore.activeScenario.id, id); 
    },
    handleStreet(closeAll) {
      this.dssStore.toggleStreetStatus(this.dssStore.uid, this.dssStore.activeScenario.id, this.singleEdge.street, closeAll);
    },
    impostaPeso() {
      this.uiStore.showToast("Funzionalità Imposta Peso in arrivo nella Next Version!", "info");
    },
    // 🔥 SELEZIONA INTERA VIA
    selectEntireStreet() {
      if (!this.singleEdge.street) return;
      // Peschiamo tutti gli archi di questa via dallo store globale
      const streetEdges = this.dssStore.allEdges.filter(e => e.street === this.singleEdge.street);
      // Usiamo il metodo esistente per sostituire la selezione
      this.dssStore.processSearchSelect(streetEdges);
    }
  }
}
</script>