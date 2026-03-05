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

    <div v-if="dssStore.showSavePromptModal" class="dss-modal-overlay">
      <div class="dss-modal">
        <h3>{{ dssStore.pendingAction?.type === 'select' ? 'SALVARE PRIMA DI CAMBIARE SCENARIO' : 'SALVARE PRIMA DI DUPLICARE SCENARIO' }}</h3>
        
        <p v-if="dssStore.pendingAction?.type === 'select'">
          Salva eventuali modifiche di "{{ dssStore.activeScenario?.label || 'questo scenario' }}" prima di lavorare su un altro scenario, oppure scarta le modifiche.
        </p>
        <p v-else>
          Salva eventuali modifiche di "{{ dssStore.activeScenario?.label || 'questo scenario' }}" prima di duplicare, oppure una vecchia versione verrà duplicata.
        </p>

        <div class="modal-footer">
          <button class="btn-annulla" @click="dssStore.resolvePendingAction(false)">
            {{ dssStore.pendingAction?.type === 'select' ? 'SCARTA' : 'IGNORA' }}
          </button>
          <button class="btn-salva" @click="dssStore.resolvePendingAction(true)">
            SALVA
          </button>
        </div>
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

/* --- MODIFICATO: Animazione fluida (Slide) --- */
.tab-content-area { 
  width: 320px; 
  background: white; 
  transition: width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); /* Slide smooth come burro */
  overflow: hidden; /* Nasconde ciò che sfora durante l'animazione */
}

/* Stato collassato: larghezza zero */
.tab-content-area.is-collapsed {
  width: 0px;
}

/* Mantiene il layout interno fisso così il testo non va a capo mentre la larghezza si riduce */
.tab-content-inner {
  width: 320px;
  display: flex; 
  flex-direction: column;
  height: 100%;
}

/* Stili Globali del Modale Preventivo */
.dss-modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15,23,42,0.85); display: flex; justify-content: center; align-items: center; z-index: 5000; }
.dss-modal { background: #0f172a; color: white; padding: 30px; border-radius: 12px; width: 400px; text-align: center; border: 1px solid #334155; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
.dss-modal h3 { margin-top: 0; font-size: 16px; border-bottom: 1px solid #334155; padding-bottom: 15px; letter-spacing: 1px; }
.modal-footer { margin-top: 30px; display: flex; justify-content: center; gap: 20px; }
.btn-annulla { background: transparent; color: white; border: 1px solid #cbd5e1; padding: 10px 25px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-salva { background: #2563eb; color: white; border: none; padding: 10px 25px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-annulla:hover { background: rgba(255,255,255,0.1); }
.btn-salva:hover { background: #1d4ed8; }
</style>