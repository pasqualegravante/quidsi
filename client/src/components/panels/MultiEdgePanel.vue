<template>
  <div class="multi-edge-panel">
    <div class="multi-selection-block">
      <h4 class="multi-title">Selezione Multipla</h4>
      <p class="multi-count">Hai selezionato <strong>{{ dssStore.selectedEdges.length }}</strong> tratti di strade diverse.</p>
    </div>

    <EdgeActionsMulti 
      @force-status="forceStatusSelected"
      @set-weight="impostaPeso"
    />
  </div>
</template>

<script>
import { useDssStore } from '../../store/dssStore';
import { useUiStore } from '../../store/uiStore';
import EdgeActionsMulti from './EdgeActionsMulti.vue';

export default {
  name: 'MultiEdgePanel',
  components: { EdgeActionsMulti },
  setup() {
    const dssStore = useDssStore();
    const uiStore = useUiStore();
    return { dssStore, uiStore };
  },
  methods: {
    async forceStatusSelected(forceClose) {
      this.uiStore.setCalculating(true, "Aggiornamento massivo dei frammenti selezionati...");
      try {
        const promises = this.dssStore.selectedEdges.map(edge => {
          const isCurrentlyClosed = this.dssStore.activeClosureIds.includes(edge.id);
          if ((forceClose && !isCurrentlyClosed) || (!forceClose && isCurrentlyClosed)) {
             return this.dssStore.toggleEdgeStatus(edge.id);
          }
          return Promise.resolve();
        });
        
        // Aspettiamo che TUTTE le strade si chiudano in parallelo
        await Promise.all(promises); 
        
        // Risultato netto visibile subito: via il giallo, chiudi sidebar!
        this.dssStore.clearMapSelection();
      } finally {
        this.uiStore.setCalculating(false);
      }
    },
    impostaPeso() {
      this.uiStore.showToast("🚧 Funzionalità 'Imposta Peso' in lavorazione (WIP)...", "info");
    }
  }
}
</script>

<style scoped>
.multi-selection-block { margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #e2e8f0; }
.multi-title { margin: 0 0 10px 0; color: #1e293b; font-size: 16px; font-weight: bold; }
.multi-count { font-size: 14px; color: #475569; margin: 0; }
</style>