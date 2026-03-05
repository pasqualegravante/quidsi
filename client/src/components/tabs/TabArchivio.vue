<template>
  <div class="tab-pane">
    <div class="pane-header">
      <h3>Archivio Scenari</h3>
      <button class="collapse-btn" @click="$emit('collapse')" title="Chiudi pannello">⮜</button>
    </div>
    
    <div class="pane-body">
      <ScenarioSearch 
        v-model="filterScenario" 
        @create="dssStore.createScenario" 
      />

      <ul class="scenario-list">
        <ScenarioItem 
          v-for="scen in filteredScenarios" 
          :key="scen.id"
          :scen="scen"
          :isActive="scen.id === dssStore.activeScenario?.id"
          :isModified="dssStore.isModified"
          @select="dssStore.selectScenario"
          @duplicate="dssStore.duplicateScenario"
          @delete="openDeleteModal"
          @save-info="handleSaveInfo"
        />
      </ul>
    </div>

    <ConfirmDeleteModal 
      :show="showDeleteModal"
      :label="scenarioToDelete?.label"
      @cancel="showDeleteModal = false"
      @confirm="executeDelete"
    />
  </div>
</template>

<script>
import { useDssStore } from '../../store/dssStore';
import ScenarioSearch from './scenario/ScenarioSearch.vue';
import ScenarioItem from './scenario/ScenarioItem.vue';
import ConfirmDeleteModal from '../modals/ConfirmDeleteModal.vue';

export default {
  name: 'TabArchivio',
  components: { ScenarioSearch, ScenarioItem, ConfirmDeleteModal },
  emits: ['collapse'],
  setup() {
    const dssStore = useDssStore();
    return { dssStore };
  },
  data() {
    return {
      filterScenario: '',
      showDeleteModal: false,
      scenarioToDelete: null
    };
  },
  computed: {
    filteredScenarios() {
      if (!this.filterScenario) return this.dssStore.scenarios;
      return this.dssStore.scenarios.filter(s => 
        s.label.toLowerCase().includes(this.filterScenario.toLowerCase())
      );
    }
  },
  methods: {
    async handleSaveInfo({ id, label, desc }) {
      await this.dssStore.updateScenarioInfo(id, label, desc);
    },
    openDeleteModal(scen) {
      this.scenarioToDelete = scen;
      this.showDeleteModal = true;
    },
    async executeDelete() {
      if (this.scenarioToDelete) {
        await this.dssStore.deleteScenario(this.scenarioToDelete.id);
        this.showDeleteModal = false;
        this.scenarioToDelete = null;
      }
    }
  }
}
</script>

<style scoped>
.tab-pane { display: flex; flex-direction: column; height: 100%; }
.pane-header { display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #f1f5f9; border-bottom: 1px solid #cbd5e1; }
.pane-header h3 { margin: 0; font-size: 14px; color: #0f172a; }
.collapse-btn { background: #e2e8f0; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px; font-weight: bold; }
.pane-body { padding: 20px; flex: 1; overflow-y: auto; }
.scenario-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px;}
</style>