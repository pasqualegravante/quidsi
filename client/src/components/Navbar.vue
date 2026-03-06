<template>
  <header class="dss-navbar">
    <div class="navbar-left-area" v-if="dssStore.activeScenario">
      <div class="scenario-brand-wrapper">
        <span class="brand-icon" @click="goHome" title="Torna alla Home">🏙️</span>
        <div class="scenario-edit-box">
          <input 
            type="text" 
            v-model="editableLabel" 
            @blur="updateScenarioName" 
            @keyup.enter="$event.target.blur()"
            class="navbar-scenario-input" 
            title="Clicca per rinominare la pratica" 
          />
          <span v-if="dssStore.isModified" class="unsaved-indicator">🔴 Da salvare</span>
        </div>
      </div>
    </div>

    <div class="navbar-search-area">
      <SearchBar />
    </div>

    <div class="navbar-actions">
      <button class="action-btn" @click="dssStore.createScenario">
        <span class="icon">📄</span><span class="label">Nuova Pratica</span>
      </button>
      
      <button class="action-btn" @click="$emit('stampa-report')">
        <span class="icon">🖨️</span><span class="label">Stampa Report</span>
      </button>

      <button :class="['action-btn', { 'btn-alert': dssStore.isModified }]" @click="dssStore.saveCurrentScenario">
        <span class="icon">💾</span><span class="label">Salva</span>
      </button>

      <button class="action-btn" @click="exportScenario">
        <span class="icon">📤</span><span class="label">Esporta</span>
      </button>
      
      <div class="user-profile">
        <span class="username">Ufficio Mobilità</span>
      </div>
    </div>
  </header>
</template>

<script>
import { useDssStore } from '../store/dssStore';
import SearchBar from './SearchBar.vue';

export default {
  name: 'Navbar',
  components: { SearchBar },
  emits: ['stampa-report'],
  setup() {
    const dssStore = useDssStore();
    return { dssStore };
  },
  data() {
    return { 
      editableLabel: '',
      isInitializing: true 
    };
  },
  watch: {
    'dssStore.activeScenario.label': {
      immediate: true,
      handler(newVal) {
        this.editableLabel = newVal || '';
        this.$nextTick(() => { this.isInitializing = false; });
      }
    }
  },
  mounted() {
    window.addEventListener('beforeunload', this.preventAccidentalClose);
  },
  beforeUnmount() {
    window.removeEventListener('beforeunload', this.preventAccidentalClose);
  },
  methods: {
    updateScenarioName() {
      if (!this.dssStore.activeScenario || this.isInitializing) return;

      const trimmed = this.editableLabel.trim();
      if (trimmed && trimmed !== this.dssStore.activeScenario.label) {
        this.dssStore.updateScenarioLabel(trimmed);
      } else {
        this.editableLabel = this.dssStore.activeScenario.label;
      }
    },
    preventAccidentalClose(e) {
      if (this.dssStore.isModified) {
        e.preventDefault();
        e.returnValue = '';
      }
    },
    goHome() {
      if (this.dssStore.isModified && !confirm("Modifiche non salvate. Uscire?")) return;
      window.location.reload();
    },
    exportScenario() {
      const scenario = this.dssStore.activeScenario;
      if (!scenario) return;
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(scenario, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", (scenario.label || 'pratica') + ".json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    }
  }
}
</script>

<style scoped>
.dss-navbar { height: 60px; background: #0f172a; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; color: white; border-bottom: 1px solid #1e293b; z-index: 1000; position: relative; }
.navbar-left-area { min-width: 320px; display: flex; align-items: center; }
.scenario-brand-wrapper { display: flex; align-items: center; gap: 12px; }
.brand-icon { font-size: 22px; cursor: pointer; filter: grayscale(1) brightness(2); }
.navbar-scenario-input { background: transparent; border: 1px solid transparent; color: #facc15; font-size: 16px; font-weight: 900; padding: 2px 4px; border-radius: 4px; width: 260px; outline: none; transition: 0.2s; cursor: text; }
.navbar-scenario-input:hover { background: #1e293b; }
.navbar-scenario-input:focus { background: white; color: #0f172a; }
.unsaved-indicator { font-size: 10px; color: #ef4444; font-weight: bold; margin-top: -2px; }
.navbar-search-area { flex: 1; display: flex; justify-content: center; padding: 0 20px; }
.navbar-actions { display: flex; align-items: center; gap: 8px; min-width: 400px; justify-content: flex-end; }
.action-btn { background: transparent; border: none; color: white; display: flex; flex-direction: column; align-items: center; cursor: pointer; font-size: 10px; padding: 4px 10px; border-radius: 6px; transition: 0.2s; opacity: 0.8; }
.action-btn:hover { opacity: 1; background: #1e293b; }
.btn-alert { color: #facc15; opacity: 1; }
.user-profile { margin-left: 10px; border-left: 1px solid #334155; padding-left: 15px; font-size: 12px; font-weight: bold; color: #94a3b8; }
</style>