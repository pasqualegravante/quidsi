<template>
  <div class="sidebar-left-wrapper">
    <div class="vertical-tabs">
      <button :class="['tab-btn', { active: activeTab === 'funzioni' && !isCollapsed }]" @click="selectTab('funzioni')">Applica funzione</button>
      <button :class="['tab-btn', { active: activeTab === 'interventi' && !isCollapsed }]" @click="selectTab('interventi')">Interventi Attivi</button>
      <button :class="['tab-btn', { active: activeTab === 'archivio' && !isCollapsed }]" @click="selectTab('archivio')">Archivio Scenari</button>
    </div>

    <div class="tab-content-area" :class="{ 'is-collapsed': isCollapsed }">
      <div class="tab-content-inner">
        <TabFunzioni v-if="activeTab === 'funzioni'" @collapse="isCollapsed = true" />
        <TabInterventi v-if="activeTab === 'interventi'" @collapse="isCollapsed = true" />
        <TabArchivio v-if="activeTab === 'archivio'" @collapse="isCollapsed = true" />
      </div>
    </div>
  </div>
</template>

<script>
import { useDssStore } from '../store/dssStore';
import { onMounted } from 'vue';
import TabFunzioni from './tabs/TabFunzioni.vue';
import TabInterventi from './tabs/TabInterventi.vue';
import TabArchivio from './tabs/TabArchivio.vue';

export default {
  name: 'SidebarLeft',
  components: {
    TabFunzioni,
    TabInterventi,
    TabArchivio
  },
  setup() {
    const dssStore = useDssStore();
    onMounted(() => { dssStore.fetchAllScenarios(); });
    return { dssStore };
  },
  data() {
    return {
      activeTab: 'funzioni', 
      isCollapsed: false     
    };
  },
  methods: {
    selectTab(tabName) {
      if (this.activeTab === tabName && !this.isCollapsed) {
        this.isCollapsed = true;
      } else {
        this.activeTab = tabName;
        this.isCollapsed = false;
      }
    }
  }
}
</script>

<style scoped>
.sidebar-left-wrapper { display: flex; height: 100%; background: #f8fafc; border-right: 1px solid #cbd5e1; z-index: 1000; position: relative; }
.vertical-tabs { display: flex; flex-direction: column; width: 45px; background: #e2e8f0; border-right: 1px solid #cbd5e1; z-index: 10; }
.tab-btn { writing-mode: vertical-rl; transform: rotate(180deg); padding: 20px 10px; cursor: pointer; border: none; background: transparent; font-weight: bold; color: #475569; border-left: 3px solid transparent; transition: 0.2s; letter-spacing: 1px; }
.tab-btn:hover { background: rgba(255,255,255,0.5); }
.tab-btn.active { background: white; border-left-color: #2563eb; color: #0f172a; }

.tab-content-area { 
  width: 320px; 
  background: white; 
  transition: width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); 
  overflow: hidden; 
}

.tab-content-area.is-collapsed {
  width: 0px;
}

.tab-content-inner {
  width: 320px;
  display: flex; 
  flex-direction: column;
  height: 100%;
}
</style>