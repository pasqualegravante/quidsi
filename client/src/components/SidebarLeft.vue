<template>
  <div class="sidebar-left-wrapper">
    <div class="vertical-tabs">
      <button :class="['tab-btn', { active: activeTab === 'funzioni' && !isCollapsed }]" @click="selectTab('funzioni')" title="Applica funzione">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
      </button>
      <button :class="['tab-btn', { active: activeTab === 'interventi' && !isCollapsed }]" @click="selectTab('interventi')" title="Interventi Attivi">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
      </button>
      <button :class="['tab-btn', { active: activeTab === 'archivio' && !isCollapsed }]" @click="selectTab('archivio')" title="Archivio Scenari">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>
      </button>
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
  components: { TabFunzioni, TabInterventi, TabArchivio },
  setup() {
    const dssStore = useDssStore();
    onMounted(() => { dssStore.fetchAllScenarios(); });
    return { dssStore };
  },
  data() { return { activeTab: 'funzioni', isCollapsed: false }; },
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
.vertical-tabs { display: flex; flex-direction: column; width: 55px; background: #e2e8f0; border-right: 1px solid #cbd5e1; z-index: 10; align-items: center; padding-top: 15px; gap: 10px; }
/* UX FIX: Stile icone al posto del testo */
.tab-btn { width: 40px; height: 40px; border-radius: 8px; cursor: pointer; border: none; background: transparent; color: #64748b; transition: 0.2s; display: flex; justify-content: center; align-items: center; }
.tab-btn svg { width: 24px; height: 24px; }
.tab-btn:hover { background: #cbd5e1; color: #0f172a; }
.tab-btn.active { background: #3b82f6; color: white; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.4); }

.tab-content-area { width: 320px; background: white; transition: 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); overflow: hidden; }
.tab-content-area.is-collapsed { width: 0; }
.tab-content-inner { width: 320px; height: 100%; overflow-y: auto; }
</style>