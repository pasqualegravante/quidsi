<template>
  <transition name="slide-right">
    <aside v-if="isOpen && dssStore.selectedEdges.length" class="sidebar-right">
      <div class="panel-header">
        <button class="collapse-btn" @click="$emit('close')">⮞</button>
      </div>

      <div class="panel-content">
        <div v-if="dssStore.selectedEdges.length === 1" class="info-text-block">
          <p><strong>ID:</strong> <span>{{ singleEdge.id }}</span></p>
          <p><strong>Via:</strong> <span>{{ singleEdge.street }}</span></p>
          <p><strong>Dir:</strong> <span>{{ singleEdge.oneWay === 1 ? 'Senso Unico' : 'Doppio Senso' }}</span></p>
          <p><strong>Limite velocità:</strong> <span>{{ singleEdge.speedLimit || '50 km/h' }}</span></p>
          <p><strong>Parametri stradali:</strong> <span>{{ singleEdge.params || 'Nessuno' }}</span></p>
        </div>

        <div v-else class="info-text-block multi-selection-block">
          <h4 class="multi-title">Selezione Multipla</h4>
          <p class="multi-count">Hai selezionato <strong>{{ dssStore.selectedEdges.length }}</strong> archi.</p>
        </div>

        <div class="action-buttons">
          <template v-if="dssStore.selectedEdges.length === 1">
            <button v-if="isStreetPartiallyClosed" class="btn-green" @click="handleStreet(false)">Riapri VIA</button>
            <button v-else class="btn-red" @click="handleStreet(true)">Chiudi VIA</button>
          </template>
          
          <button class="btn-mixed" @click="toggleArchiSelezionati">
            {{ dssStore.selectedEdges.length > 1 ? 'Inverti Stato Tratti' : (isSingleEdgeClosed ? 'Apri Tratto' : 'Chiudi Tratto') }}
          </button>

          <button class="btn-dark-blue" @click="impostaPeso" title="(*) Next Version">
            Imposta Peso
          </button>
        </div>
      </div>
    </aside>
  </transition>
</template>

<script>
import { useDssStore } from '../store/dssStore';
import { uiStore } from '../store/uiStore';

export default {
  name: 'SidebarRight',
  props: { isOpen: Boolean },
  emits: ['close'],
  setup() {
    const dssStore = useDssStore();
    return { dssStore, uiStore };
  },
  computed: {
    // Helper per estrarre l'unico arco quando la selezione è singola
    singleEdge() {
      return this.dssStore.selectedEdges[0] || {};
    },
    isSingleEdgeClosed() { 
      return this.dssStore.activeClosureIds.includes(this.singleEdge.id); 
    },
    isStreetPartiallyClosed() {
      if (this.dssStore.selectedEdges.length > 1) return false;
      return this.dssStore.allEdges
        .filter(e => e.street === this.singleEdge.street)
        .some(e => this.dssStore.activeClosureIds.includes(e.id));
    }
  },
  methods: {
    // --- NUOVO --- Esegue il toggle su tutti gli archi selezionati
    async toggleArchiSelezionati() {
      for (const edge of this.dssStore.selectedEdges) {
        await this.dssStore.toggleEdgeStatus(edge.id);
      }
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
.sidebar-right { position: absolute; top: 80px; right: 20px; width: 280px; background: white; border-radius: 16px; padding: 20px; box-shadow: -5px 0 20px rgba(0,0,0,0.1); z-index: 1100; }
.panel-header { display: flex; justify-content: flex-end; margin-bottom: 10px; }
.collapse-btn { background: none; border: none; font-size: 20px; cursor: pointer; }

.info-text-block p { display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; margin: 10px 0; font-size: 14px;}
.multi-selection-block { background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #cbd5e1; text-align: center; }
.multi-title { margin: 0 0 10px 0; color: #0f172a; }
.multi-count { font-size: 15px !important; display: block !important; border: none !important; justify-content: center !important; }

.action-buttons { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
.btn-red { background: #ef4444; color: white; padding: 12px; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; }
.btn-green { background: #22c55e; color: white; padding: 12px; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; }
.btn-mixed { background: #e2e8f0; color: #0f172a; padding: 12px; border-radius: 8px; border: 2px solid #94a3b8; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-mixed:hover { background: #cbd5e1; }
.btn-dark-blue { background: #0f172a; color: white; padding: 12px; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; transition: background-color 0.2s; }
.btn-dark-blue:hover { background: #1e293b; }

.slide-right-enter-active, .slide-right-leave-active { transition: transform 0.3s ease; }
.slide-right-enter-from, .slide-right-leave-to { transform: translateX(120%); }
</style>