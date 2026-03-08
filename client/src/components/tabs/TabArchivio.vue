<template>
  <div class="tab-pane">
    <div class="pane-header">
      <h3>Archivio Pratiche</h3>
      <button class="collapse-btn" @click="$emit('collapse')" title="Chiudi pannello">⮜</button>
    </div>

    <div class="pane-body">
      <ScenarioSearch v-model="filterScenario" @create="dssStore.createScenario" />

      <ul class="scenario-list">
        <ScenarioItem v-for="scen in filteredScenarios" :key="scen.id" :scen="scen"
          :isActive="scen.id === dssStore.activeScenario?.id" :isModified="dssStore.isModified"
          @select="dssStore.selectScenario" @duplicate="dssStore.duplicateScenario" @delete="openDeleteModal"
          @save-info="handleSaveInfo" @save-state="dssStore.saveCurrentScenario" />
      </ul>
    </div>
  </div>
</template>

<script>
import { useDssStore } from '../../store/dssStore';
import { useUiStore } from '../../store/uiStore';
import ScenarioSearch from './scenario/ScenarioSearch.vue';
import ScenarioItem from './scenario/ScenarioItem.vue';
import { useScenarioStore } from '../../store/scenarioStore';

export default {
  name: 'TabArchivio',
  components: { ScenarioSearch, ScenarioItem },
  emits: ['collapse'],
  setup() {
    const dssStore = useDssStore();
    const uiStore = useUiStore();
    return { dssStore, uiStore };
  },
  data() { return { filterScenario: '' }; },
  computed: {
    filteredScenarios() {
      if (!this.filterScenario) return this.dssStore.scenarios;
      return this.dssStore.scenarios.filter(s => s.label.toLowerCase().includes(this.filterScenario.toLowerCase()));
    }
  },
  methods: {
    handleSaveInfo(payload) {
      const dssStore = useScenarioStore();
      dssStore.updateScenarioInfo(payload.id, {
        label: payload.label,
        description: payload.description
      });
    },
    openDeleteModal(scen) {
      this.uiStore.openModal('deleteScenario', scen);
    }
  }
}
</script>

<style scoped>
.tab-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.pane-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.pane-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: bold;
  color: #0f172a;
}

.collapse-btn {
  background: #e2e8f0;
  color: #0f172a;
  border: none;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  font-weight: bold;
  transition: background 0.2s;
}

.collapse-btn:hover {
  background: #cbd5e1;
}

.pane-body {
  flex: 1;
  padding: 15px;
  overflow-y: auto;
  background: white;
}

.scenario-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
</style>