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
      // Logica massiva centralizzata nell'orchestratore
      for (const edge of this.dssStore.selectedEdges) {
        const isCurrentlyClosed = this.dssStore.activeClosureIds.includes(edge.id);
        if ((forceClose && !isCurrentlyClosed) || (!forceClose && isCurrentlyClosed)) {
          await this.dssStore.toggleEdgeStatus(edge.id);
        }
      }
    },
    impostaPeso() {
      this.uiStore.showToast("Funzionalità Imposta Peso in arrivo nella Next Version!", "info");
    }
  }
}
</script>

<style scoped>
/* CSS originale ripristinato per il blocco multiplo */
.multi-selection-block { background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #cbd5e1; text-align: center; }
.multi-title { margin: 0 0 10px 0; color: #0f172a; }
.multi-count { font-size: 13px !important; display: block !important; border: none !important; color: #475569; margin: 0;}
</style>