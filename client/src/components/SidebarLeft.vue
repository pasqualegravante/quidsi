<template>
  <div class="sidebar-left-wrapper">
    <div class="vertical-tabs">
      <button 
        :class="['tab-btn', { active: uiStore.activeLeftTab === 'funzioni' && !uiStore.isLeftSidebarCollapsed }]" 
        @click="selectTab('funzioni')" 
        title="Applica funzione"
      >
        <span class="tab-label">Applica funzione</span>
      </button>

      <button 
        :class="['tab-btn', { active: uiStore.activeLeftTab === 'interventi' && !uiStore.isLeftSidebarCollapsed }]" 
        @click="selectTab('interventi')" 
        title="Interventi Attivi"
      >
        <span class="tab-label">Interventi Attivi</span>
      </button>

      <button 
        :class="['tab-btn', { active: uiStore.activeLeftTab === 'archivio' && !uiStore.isLeftSidebarCollapsed }]" 
        @click="selectTab('archivio')" 
        title="Archivio Scenari"
      >
        <span class="tab-label">Archivio Scenari</span>
      </button>
    </div>

    <div class="tab-content-area" :class="{ 'is-collapsed': uiStore.isLeftSidebarCollapsed }">
      <div class="tab-content-inner">
        <TabFunzioni v-show="uiStore.activeLeftTab === 'funzioni'" @collapse="uiStore.setLeftSidebar(false)" />
        <TabInterventi v-show="uiStore.activeLeftTab === 'interventi'" @collapse="uiStore.setLeftSidebar(false)" />
        <TabArchivio v-show="uiStore.activeLeftTab === 'archivio'" @collapse="uiStore.setLeftSidebar(false)" />
      </div>
    </div>
  </div>
</template>

<script>
import { useDssStore } from '../store/dssStore';
import { useUiStore } from '../store/uiStore';
import { onMounted } from 'vue';
import TabFunzioni from './tabs/TabFunzioni.vue';
import TabInterventi from './tabs/TabInterventi.vue';
import TabArchivio from './tabs/TabArchivio.vue';

export default {
  name: 'SidebarLeft',
  components: { TabFunzioni, TabInterventi, TabArchivio },
  setup() {
    const dssStore = useDssStore();
    const uiStore = useUiStore(); 
    
    onMounted(() => { dssStore.fetchAllScenarios(); });
    
    return { dssStore, uiStore };
  },
  methods: {
    selectTab(tabName) {
      if (this.uiStore.activeLeftTab === tabName && !this.uiStore.isLeftSidebarCollapsed) {
        this.uiStore.setLeftSidebar(false); 
      } else {
        this.uiStore.setActiveTab(tabName); 
        this.uiStore.setLeftSidebar(true);  
      }
    }
  }
}
</script>
<style scoped>
.sidebar-left-wrapper { 
  display: flex; 
  height: 100%; 
  z-index: 1000; 
  position: relative; 
}

.vertical-tabs { 
  display: flex; 
  flex-direction: column; 
  width: 35px; 
  background: #e2e8f0; 
  border-right: 1px solid #cbd5e1; 
  z-index: 10; 
  align-items: center; 
}

.tab-btn { 
  width: 100%; 
  height: 110px; 
  cursor: pointer; 
  border: none; 
  border-bottom: 1px solid #cbd5e1; 
  border-right: 1px solid #cbd5e1;
  /* 🔥 Bordo trasparente per non far saltare il bottone quando si attiva */
  border-left: 3px solid transparent; 
  background: transparent; 
  color: #64748b; 
  transition: 0.2s; 
  display: flex; 
  justify-content: center; 
  align-items: center; 
  padding: 0; 
}

.tab-btn:hover { 
  background: #f1f5f9; 
  color: #0f172a; 
}

.tab-btn.active { 
  background: white; 
  color: #0f172a; 
  font-weight: 700;
  border-right: 3px solid #2563eb; 
}

.tab-label {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-family: 'Inter', sans-serif; 
  font-size: 12px; 
  white-space: nowrap;
  padding: 15px 0; 
}

.tab-content-area { 
  width: clamp(280px, 20vw, 400px); 
  background: white; 
  border-right: 1px solid #cbd5e1;
  transition: 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); 
  overflow: hidden; 
  display: flex;
}

.tab-content-area.is-collapsed { 
  width: 0; 
  min-width: 0; 
  border-right: none;
}

.tab-content-inner { 
  width: clamp(280px, 20vw, 400px); 
  height: 100%; 
  overflow: hidden; 
}
</style>