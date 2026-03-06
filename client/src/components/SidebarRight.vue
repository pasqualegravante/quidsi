<template>
  <transition name="slide-right">
    <aside v-if="isOpen && dssStore.selectedEdges.length" class="sidebar-right">
      <div class="panel-header">
        <button class="collapse-btn" @click="dssStore.clearMapSelection()" title="Chiudi e deseleziona">⮞</button>
      </div>

      <div class="panel-content">
        <SingleEdgePanel v-if="isSameStreet" />
        <MultiEdgePanel v-else />
      </div>
    </aside>
  </transition>
</template>

<script>
import { useDssStore } from '../store/dssStore';
import SingleEdgePanel from './panels/SingleEdgePanel.vue';
import MultiEdgePanel from './panels/MultiEdgePanel.vue';

export default {
  name: 'SidebarRight',
  components: { SingleEdgePanel, MultiEdgePanel },
  props: { isOpen: Boolean },
  setup() {
    const dssStore = useDssStore();
    return { dssStore };
  },
  computed: {
    isSameStreet() {
      if (this.dssStore.selectedEdges.length === 0) return false;
      const firstStreet = this.dssStore.selectedEdges[0].street;
      return this.dssStore.selectedEdges.every(e => e.street === firstStreet);
    }
  }
}
</script>

<style scoped>
/* Il CSS è rimasto identico all'ultimo aggiornamento (perfettamente centrato) */
.sidebar-right { position: absolute; top: 50%; transform: translateY(-50%); right: 20px; width: 280px; max-height: 85vh; overflow-y: auto; background: white; border-radius: 16px; padding: 20px; box-shadow: -5px 0 20px rgba(0, 0, 0, 0.15); z-index: 1000; }
.sidebar-right::-webkit-scrollbar { width: 6px; }
.sidebar-right::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.sidebar-right::-webkit-scrollbar-track { background: transparent; }
.panel-header { display: flex; justify-content: flex-start; margin-bottom: 15px; }
.collapse-btn { background: #f1f5f9; border: none; font-size: 14px; cursor: pointer; padding: 5px 10px; border-radius: 6px; color: #475569; transition: 0.2s; }
.collapse-btn:hover { background: #e2e8f0; color: #0f172a; }
.slide-right-enter-active, .slide-right-leave-active { transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
.slide-right-enter-from, .slide-right-leave-to { transform: translate(100%, -50%); opacity: 0; }
</style>