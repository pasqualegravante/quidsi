<template>
  <header class="dss-navbar">
    <div class="navbar-brand" @click="goHome">
      <span class="brand-quidsi">QuidSi</span>
    </div>
    <div class="navbar-search-wrapper"><SearchBar /></div>
    <div class="navbar-actions">
      <button class="action-btn" @click="dssStore.createScenario">
        <span class="icon">📄</span><span class="label">New</span>
      </button>
      
      <button class="action-btn" @click="$emit('stampa-report')">
        <span class="icon">🖨️</span><span class="label">Report</span>
      </button>

      <button class="action-btn" @click="dssStore.saveCurrentScenario">
        <span class="icon">💾</span><span class="label">Salva</span>
      </button>

      <button class="action-btn" @click="exportScenario">
        <span class="icon">📤</span><span class="label">Export</span>
      </button>
      
      <div class="user-profile">
        <span class="avatar">👤</span><span class="username">Operatore</span>
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
    return { dssStore: useDssStore() };
  },
  methods: {
    goHome() { window.location.reload(); },
    exportScenario() {
      const scenario = this.dssStore.activeScenario;
      if (!scenario) return;
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(scenario, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", (scenario.label ? scenario.label.replace(/\s+/g, '_') : 'scenario') + ".json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    }
  }
}
</script>

<style scoped>
.dss-navbar { height: 60px; background: #0f172a; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; color: white; border-bottom: 2px solid #1e293b; z-index: 2000; position: relative; }
.brand-quidsi { color: #facc15; font-weight: 900; font-size: 20px; cursor: pointer; }
.navbar-search-wrapper { display: flex; justify-content: center; flex: 1; padding: 0 20px; }
.navbar-actions { display: flex; align-items: center; gap: 15px; }
.action-btn { background: transparent; border: none; color: white; display: flex; flex-direction: column; align-items: center; cursor: pointer; font-size: 11px; opacity: 0.8; transition: 0.2s; }
.action-btn:hover { opacity: 1; transform: translateY(-2px); }
.action-btn .icon { font-size: 18px; margin-bottom: 3px; }
.user-profile { display: flex; align-items: center; gap: 8px; margin-left: 15px; border-left: 1px solid #334155; padding-left: 15px; }
.avatar { background: #3b82f6; padding: 5px; border-radius: 50%; font-size: 14px; }
.username { font-size: 13px; font-weight: bold; color: #cbd5e1; }
</style>