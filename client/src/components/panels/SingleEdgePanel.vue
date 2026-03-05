<template>
  <div class="single-edge-panel">
    <div class="info-text-block">
      <p v-if="dssStore.selectedEdges.length === 1"><strong>ID:</strong> <span>{{ singleEdge.id }}</span></p>
      <p v-else><strong>ID:</strong> <span class="badge-multi">Multipli ({{ dssStore.selectedEdges.length }} tratti)</span></p>
      
      <p><strong>Via:</strong> <span>{{ singleEdge.street }}</span></p>
      <p><strong>Dir:</strong> <span>{{ singleEdge.oneWay === 1 ? 'Senso Unico' : 'Doppio Senso' }}</span></p>
      <p><strong>Limite velocità:</strong> <span>{{ singleEdge.speedLimit || '50 km/h' }}</span></p>
      <p><strong>Parametri stradali:</strong> <span>{{ singleEdge.params || 'Nessuno' }}</span></p>
    </div>

    <div class="action-buttons">
      <button v-if="isStreetPartiallyClosed" class="btn-green" @click="handleStreet(false)">Riapri intera VIA</button>
      <button v-else class="btn-red" @click="handleStreet(true)">Chiudi intera VIA</button>
      
      <template v-if="dssStore.selectedEdges.length === 1">
        <button :class="isSingleEdgeClosed ? 'btn-green-light' : 'btn-red-light'" @click="toggleArco(singleEdge.id)">
          {{ isSingleEdgeClosed ? 'Apri Tratto' : 'Chiudi Tratto' }}
        </button>
      </template>

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
  name: 'SingleEdgePanel',
  setup() {
    const dssStore = useDssStore();
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
.info-text-block p { display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; margin: 10px 0; font-size: 14px; align-items: center;}
.badge-multi { background: #e2e8f0; color: #334155; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; }

.action-buttons { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
.btn-red { background: #ef4444; color: white; padding: 12px; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-green { background: #22c55e; color: white; padding: 12px; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-red:hover { background: #dc2626; }
.btn-green:hover { background: #16a34a; }

.btn-red-light { background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 8px; border: 1px solid #ef4444; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-green-light { background: #dcfce7; color: #166534; padding: 12px; border-radius: 8px; border: 1px solid #22c55e; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-red-light:hover { background: #fecaca; }
.btn-green-light:hover { background: #bbf7d0; }

.btn-dark-blue { background: #0f172a; color: white; padding: 12px; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; transition: background-color 0.2s; }
.btn-dark-blue:hover { background: #1e293b; }
</style>