<template>
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
</template>

<script>
import { useDssStore } from '../../store/dssStore';

export default {
  name: 'NavbarTitle',
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
    goHome() {
      if (this.dssStore.isModified && !confirm("Modifiche non salvate. Uscire?")) return;
      window.location.reload();
    }
  }
}
</script>

<style scoped>
.navbar-left-area { min-width: 320px; display: flex; align-items: center; }
.scenario-brand-wrapper { display: flex; align-items: center; gap: 12px; }
.brand-icon { font-size: 22px; cursor: pointer; filter: grayscale(1) brightness(2); }
.scenario-edit-box { display: flex; flex-direction: column; justify-content: center; }
.navbar-scenario-input { background: transparent; border: 1px solid transparent; color: #facc15; font-size: 16px; font-weight: 900; padding: 2px 4px; border-radius: 4px; width: 260px; outline: none; transition: 0.2s; cursor: text; }
.navbar-scenario-input:hover { background: #1e293b; }
.navbar-scenario-input:focus { background: white; color: #0f172a; }
.unsaved-indicator { font-size: 10px; color: #ef4444; font-weight: bold; margin-top: -2px; }
</style>