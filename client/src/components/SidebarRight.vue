<template>
  <transition name="slide-right">
    <aside v-if="isOpen && dssStore.selectedEdges.length" class="sidebar-right">
      <div class="panel-header">
        <button class="collapse-btn" @click="$emit('close')">⮞</button>
      </div>

      <div class="panel-content">
        <div v-if="isSameStreet" class="info-text-block">
          <p v-if="dssStore.selectedEdges.length === 1"><strong>ID:</strong> <span>{{ singleEdge.id }}</span></p>
          <p v-else><strong>ID:</strong> <span class="badge-multi">Multipli ({{ dssStore.selectedEdges.length }} tratti)</span></p>
          
          <p><strong>Via:</strong> <span>{{ singleEdge.street }}</span></p>
          <p><strong>Dir:</strong> <span>{{ singleEdge.oneWay === 1 ? 'Senso Unico' : 'Doppio Senso' }}</span></p>
          <p><strong>Limite velocità:</strong> <span>{{ singleEdge.speedLimit || '50 km/h' }}</span></p>
          <p><strong>Parametri stradali:</strong> <span>{{ singleEdge.params || 'Nessuno' }}</span></p>
        </div>

        <div v-else class="info-text-block multi-selection-block">
          <h4 class="multi-title">Selezione Multipla</h4>
          <p class="multi-count">Hai selezionato <strong>{{ dssStore.selectedEdges.length }}</strong> tratti di strade diverse.</p>
        </div>

        <div class="action-buttons">
          <template v-if="isSameStreet">
            <button v-if="isStreetPartiallyClosed" class="btn-green" @click="handleStreet(false)">Riapri intera VIA</button>
            <button v-else class="btn-red" @click="handleStreet(true)">Chiudi intera VIA</button>
          </template>
          
          <template v-if="dssStore.selectedEdges.length === 1">
            <button :class="isSingleEdgeClosed ? 'btn-green-light' : 'btn-red-light'" @click="toggleArco(singleEdge.id)">
              {{ isSingleEdgeClosed ? 'Apri Tratto' : 'Chiudi Tratto' }}
            </button>
          </template>
          <template v-else>
            <button class="btn-red-light" @click="forceStatusSelected(true)">Chiudi Selezionati</button>
            <button class="btn-green-light" @click="forceStatusSelected(false)">Riapri Selezionati</button>
          </template>

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
    // Helper per estrarre i dati di base (usa il primo arco selezionato come riferimento)
    singleEdge() {
      return this.dssStore.selectedEdges[0] || {};
    },
    // Controlla se tutti gli archi selezionati appartengono esattamente alla stessa strada
    isSameStreet() {
      if (this.dssStore.selectedEdges.length === 0) return false;
      const firstStreet = this.singleEdge.street;
      return this.dssStore.selectedEdges.every(e => e.street === firstStreet);
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
    
    // Forza la chiusura o l'apertura specifica di tutti i frammenti selezionati
    async forceStatusSelected(forceClose) {
      for (const edge of this.dssStore.selectedEdges) {
        const isCurrentlyClosed = this.dssStore.activeClosureIds.includes(edge.id);
        // Chiama l'API solo se lo stato attuale è diverso da quello desiderato
        if ((forceClose && !isCurrentlyClosed) || (!forceClose && isCurrentlyClosed)) {
          await this.dssStore.toggleEdgeStatus(edge.id);
        }
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

.info-text-block p { display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; margin: 10px 0; font-size: 14px; align-items: center;}
.badge-multi { background: #e2e8f0; color: #334155; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; }

.multi-selection-block { background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #cbd5e1; text-align: center; }
.multi-title { margin: 0 0 10px 0; color: #0f172a; }
.multi-count { font-size: 13px !important; display: block !important; border: none !important; justify-content: center !important; color: #475569; }

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

.slide-right-enter-active, .slide-right-leave-active { transition: transform 0.3s ease; }
.slide-right-enter-from, .slide-right-leave-to { transform: translateX(120%); }
</style>