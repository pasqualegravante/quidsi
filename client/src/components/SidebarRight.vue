<template>
  <transition name="slide-right">
    <aside v-if="isOpen && dssStore.selectedEdges.length" class="sidebar-right">
      <div class="panel-header">
        <button class="collapse-btn" @click="$emit('close')">⮞</button>
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
  components: {
    SingleEdgePanel,
    MultiEdgePanel
  },
  props: { isOpen: Boolean },
  emits: ['close'],
  setup() {
    const dssStore = useDssStore();
    return { dssStore };
  },
  computed: {
    // Il "cervello" che decide quale componente caricare
    isSameStreet() {
      if (this.dssStore.selectedEdges.length === 0) return false;
      const firstStreet = this.dssStore.selectedEdges[0].street;
      return this.dssStore.selectedEdges.every(e => e.street === firstStreet);
    }
  }
}
</script>

<style scoped>
.sidebar-right { position: absolute; top: 80px; right: 20px; width: 280px; background: white; border-radius: 16px; padding: 20px; box-shadow: -5px 0 20px rgba(0,0,0,0.1); z-index: 1100; }
.panel-header { display: flex; justify-content: flex-end; margin-bottom: 10px; }
.collapse-btn { background: none; border: none; font-size: 20px; cursor: pointer; }

/* Animazioni della barra */
.slide-right-enter-active, .slide-right-leave-active { transition: transform 0.3s ease; }
.slide-right-enter-from, .slide-right-leave-to { transform: translateX(120%); }
</style>