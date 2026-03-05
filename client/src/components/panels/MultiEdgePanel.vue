<template>
  <div class="multi-edge-panel">
    <div class="multi-selection-block">
      <h4 class="multi-title">Selezione Multipla</h4>
      <p class="multi-count">Hai selezionato <strong>{{ dssStore.selectedEdges.length }}</strong> tratti di strade diverse.</p>
    </div>

    <div class="action-buttons">
      <button class="btn-red-light" @click="forceStatusSelected(true)">Chiudi Selezionati</button>
      <button class="btn-green-light" @click="forceStatusSelected(false)">Riapri Selezionati</button>

      <button class="btn-dark-blue" @click="impostaPeso" title="(*) Next Version">
        Imposta Peso
      </button>
    </div>
  </div>
</template>

<script>
import { useDssStore } from '../../store/dssStore';
import { uiStore } from '../../store/uiStore';

export default {
  name: 'MultiEdgePanel',
  setup() {
    const dssStore = useDssStore();
    return { dssStore, uiStore };
  },
  methods: {
    async forceStatusSelected(forceClose) {
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
.multi-selection-block { background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #cbd5e1; text-align: center; }
.multi-title { margin: 0 0 10px 0; color: #0f172a; }
.multi-count { font-size: 13px !important; display: block !important; border: none !important; color: #475569; }

.action-buttons { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
.btn-red-light { background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 8px; border: 1px solid #ef4444; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-green-light { background: #dcfce7; color: #166534; padding: 12px; border-radius: 8px; border: 1px solid #22c55e; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-red-light:hover { background: #fecaca; }
.btn-green-light:hover { background: #bbf7d0; }

.btn-dark-blue { background: #0f172a; color: white; padding: 12px; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; transition: background-color 0.2s; }
.btn-dark-blue:hover { background: #1e293b; }
</style>