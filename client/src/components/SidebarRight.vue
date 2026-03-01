<template>
  <transition name="slide-right">
    <aside v-if="isOpen" class="sidebar-right">
      <div class="panel-content" v-if="selectedEdge">
        <div class="action-buttons">
          <button class="btn-green-light" @click="toggleArco(selectedEdge.id)">
            {{ isEdgeClosed ? 'Riapri Tratto' : 'Chiudi Tratto' }}
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
    isEdgeClosed() {
      if (!this.selectedEdge) return false;
      return this.dssStore.activeClosureIds.includes(this.selectedEdge.id);
    }
  },
  methods: {
    toggleArco(id) {
      this.dssStore.toggleEdgeStatus(id);
    }
  }
}
</script>
<style scoped>
.sidebar-right { position: absolute; top: 60px; right: 0; bottom: 0; width: 280px; background: white; border-left: 1px solid #cbd5e1; z-index: 1000; box-shadow: -4px 0 15px rgba(0,0,0,0.05); border-radius: 16px 0 0 16px; margin-top: 20px; height: calc(100% - 100px); }
.panel-header { padding: 15px; border-bottom: 1px solid #f1f5f9; }
.collapse-btn { background: #e2e8f0; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px; font-weight: bold; }

.panel-content { padding: 25px 20px; }
.info-text-block { font-family: 'Times New Roman', serif; font-size: 14px; color: #333; line-height: 1.8; margin-bottom: 30px; }
.info-text-block p { margin: 0; border-bottom: 1px dotted #ccc; display: flex; justify-content: space-between; }

.action-buttons { display: flex; flex-direction: column; gap: 15px; margin-bottom: 30px; }
.btn-green { background: #86efac; border: 1px solid #22c55e; padding: 12px; border-radius: 20px; font-weight: bold; color: #14532d; cursor: pointer; text-align: center; }
.btn-green-light { background: #bbf7d0; border: 1px solid #4ade80; padding: 12px; border-radius: 20px; font-weight: bold; color: #166534; cursor: pointer; text-align: center; }
.btn-dark-blue { background: #0f172a; border: none; padding: 12px; border-radius: 20px; font-weight: bold; color: white; cursor: pointer; text-align: center; }

.secondary-actions { align-items: center; }
.version-hint { font-size: 11px; color: #64748b; }

.slide-right-enter-active, .slide-right-leave-active { transition: transform 0.3s ease; }
.slide-right-enter-from, .slide-right-leave-to { transform: translateX(100%); }
</style>