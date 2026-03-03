<template>
  <transition name="slide-right">
    <aside v-if="isOpen && selectedEdge" class="sidebar-right">
      <div class="panel-header">
        <button class="collapse-btn" @click="$emit('close')">⮞</button>
      </div>

      <div class="panel-content">
        <div class="info-text-block">
          <p><strong>ID:</strong> <span>{{ selectedEdge.id }}</span></p>
          <p><strong>Via:</strong> <span>{{ selectedEdge.street }}</span></p>
          <p><strong>Dir:</strong> <span>{{ selectedEdge.oneWay === 1 ? 'Senso Unico' : 'Doppio Senso' }}</span></p>
        </div>

        <div class="action-buttons">
          <button v-if="isStreetPartiallyClosed" class="btn-green" @click="handleStreet(false)">Riapri VIA</button>
          <button v-else class="btn-red" @click="handleStreet(true)">Chiudi VIA</button>
          
          <button :class="isEdgeClosed ? 'btn-green-light' : 'btn-red-light'" @click="toggleArco(selectedEdge.id)">
            {{ isEdgeClosed ? 'Apri Tratto' : 'Chiudi Tratto' }}
          </button>
        </div>
      </div>
    </aside>
  </transition>
</template>

<script>
import { useDssStore } from '../store/dssStore';

export default {
  name: 'SidebarRight',
  props: { isOpen: Boolean, selectedEdge: Object },
  emits: ['close'],
  setup() {
    const dssStore = useDssStore();
    return { dssStore };
  },
  computed: {
    isEdgeClosed() { return this.dssStore.activeClosureIds.includes(this.selectedEdge.id); },
    isStreetPartiallyClosed() {
      return this.dssStore.allEdges
        .filter(e => e.street === this.selectedEdge.street)
        .some(e => this.dssStore.activeClosureIds.includes(e.id));
    }
  },
  methods: {
    toggleArco(id) { this.dssStore.toggleEdgeStatus(id); },
    handleStreet(shouldClose) { this.dssStore.toggleStreetStatus(this.selectedEdge.street, shouldClose); }
  }
}
</script>

<style scoped>
.sidebar-right { position: absolute; top: 80px; right: 20px; width: 280px; background: white; border-radius: 16px; padding: 20px; box-shadow: -5px 0 20px rgba(0,0,0,0.1); z-index: 1100; }
.panel-header { display: flex; justify-content: flex-end; margin-bottom: 10px; }
.collapse-btn { background: none; border: none; font-size: 20px; cursor: pointer; }
.info-text-block p { display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; margin: 10px 0; font-size: 14px;}
.action-buttons { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
.btn-red { background: #ef4444; color: white; padding: 12px; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; }
.btn-green { background: #22c55e; color: white; padding: 12px; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; }
.btn-red-light { background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 8px; border: 1px solid #ef4444; cursor: pointer; font-weight: bold; }
.btn-green-light { background: #dcfce7; color: #166534; padding: 12px; border-radius: 8px; border: 1px solid #22c55e; cursor: pointer; font-weight: bold; }
.slide-right-enter-active, .slide-right-leave-active { transition: transform 0.3s ease; }
.slide-right-enter-from, .slide-right-leave-to { transform: translateX(120%); }
</style>