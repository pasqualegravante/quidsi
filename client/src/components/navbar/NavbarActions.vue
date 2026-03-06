<template>
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
</template>

<script>
import { useDssStore } from '../../store/dssStore';

export default {
  name: 'NavbarActions',
  emits: ['stampa-report'],
  setup() {
    const dssStore = useDssStore();
    return { dssStore };
  },
  methods: {
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
.navbar-actions { display: flex; align-items: center; gap: 8px; min-width: 400px; justify-content: flex-end; }
.action-btn { background: transparent; border: none; color: white; display: flex; flex-direction: column; align-items: center; cursor: pointer; font-size: 10px; padding: 4px 10px; border-radius: 6px; transition: 0.2s; opacity: 0.8; }
.action-btn:hover { opacity: 1; background: #1e293b; }
.btn-alert { color: #facc15; opacity: 1; }
.user-profile { margin-left: 10px; border-left: 1px solid #334155; padding-left: 15px; font-size: 12px; font-weight: bold; color: #94a3b8; }
</style>