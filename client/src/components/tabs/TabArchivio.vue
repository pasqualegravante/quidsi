<template>
  <div class="tab-pane">
    <div class="pane-header">
      <h3>Archivio Scenari</h3>
      <button class="collapse-btn">⮜</button>
    </div>
    
    <div class="pane-body">
      <div class="search-scenario-bar">
        <input type="text" v-model="filterScenario" placeholder="Cerca scenario..." class="scenario-search-input" />
        <button class="btn-new-inline" @click="dssStore.createScenario">Nuovo scenario</button>
      </div>

      <ul class="scenario-list">
        <li v-for="scen in filteredScenarios" :key="scen.id" class="scenario-row">
          <div class="scenario-main-info">
            
            <div v-if="editingScenId !== scen.id">
              <span class="scen-label">
                {{ scen.label }} 
                <strong v-if="scen.id === dssStore.activeScenario?.id && dssStore.isModified" class="mod-tag">
                  [MODIFICATO]
                </strong>
              </span>
              <p class="scen-desc">{{ scen.description || 'Nessuna descrizione.' }}</p>
            </div>

            <div v-else class="edit-mode-container">
              <input v-model="editLabel" class="edit-input" placeholder="Nome scenario" />
              <textarea v-model="editDesc" class="edit-textarea" placeholder="Descrizione..."></textarea>
              <div class="edit-actions">
                <button class="btn-cancel-sm" @click="cancelEdit">Annulla</button>
                <button class="btn-save-sm" @click="saveInfo(scen.id)">Salva</button>
              </div>
            </div>

          </div>
          
          <div class="scenario-actions" v-if="editingScenId !== scen.id">
            <button @click="startEdit(scen)" title="Modifica Nome">✏️</button>
            <button @click="dssStore.selectScenario(scen.id)" title="Seleziona e Carica">📂</button>
            <button @click="dssStore.duplicateScenario(scen.id)" title="Duplica">📋</button>
            <button @click="openDeleteModal(scen)" title="Elimina">🗑️</button>
          </div>
        </li>
      </ul>
    </div>

    <div v-if="showDeleteModal" class="dss-modal-overlay">
      <div class="dss-modal">
        <h3>CONFERMA ELIMINAZIONE</h3>
        <p>Vuoi davvero eliminare "{{ scenarioToDelete?.label }}"?</p>
        <div class="modal-footer">
          <button class="btn-annulla" @click="showDeleteModal = false">ANNULLA</button>
          <button class="btn-elimina" @click="executeDelete">ELIMINA</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import { useDssStore } from '../../store/dssStore';

export default {
  name: 'TabArchivio',
  setup() {
    const dssStore = useDssStore();
    return { dssStore };
  },
  data() {
    return {
      filterScenario: '',
      showDeleteModal: false,
      scenarioToDelete: null,
      editingScenId: null,
      editLabel: '',
      editDesc: ''
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
    startEdit(scen) {
      this.editingScenId = scen.id;
      this.editLabel = scen.label;
      this.editDesc = scen.description || '';
    },
    cancelEdit() {
      this.editingScenId = null;
    },
    async saveInfo(id) {
      await this.dssStore.updateScenarioInfo(id, this.editLabel, this.editDesc);
      this.editingScenId = null;
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

.search-scenario-bar { margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px; }
.scenario-search-input { width: 100%; padding: 12px 15px; border-radius: 20px; border: 1px solid #cbd5e1; box-sizing: border-box; font-family: 'Inter', sans-serif; font-size: 12px; outline: none; }
.scenario-search-input:focus { border-color: #2563eb; }
.btn-new-inline { background: #1e293b; color: white; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.btn-new-inline:hover { background: #0f172a; }

.scenario-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px;}
.scenario-row { border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; background: #f8fafc; }
.scenario-main-info { margin-bottom: 12px; }
.scen-label { font-weight: 800; font-size: 14px; color: #0f172a; display: block; }
.scen-desc { font-size: 12px; color: #64748b; margin: 5px 0 0 0; }
.mod-tag { color: #ef4444; font-size: 11px; margin-left: 5px; border: 1px solid #ef4444; padding: 2px 4px; border-radius: 4px; }
.scenario-actions { display: flex; justify-content: flex-end; gap: 8px; }
.scenario-actions button { background: white; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer; font-size: 16px; padding: 6px 10px; transition: 0.2s;}
.scenario-actions button:hover { background: #e2e8f0; transform: translateY(-1px); }

.edit-mode-container { display: flex; flex-direction: column; gap: 8px; }
.edit-input { width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #2563eb; font-weight: bold; outline: none; font-size: 13px; font-family: 'Inter', sans-serif; }
.edit-textarea { width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #cbd5e1; font-size: 11px; resize: none; height: 60px; outline: none; font-family: 'Inter', sans-serif; }
.edit-actions { display: flex; gap: 10px; justify-content: flex-end; }
.btn-save-sm { background: #2563eb; color: white; border: none; padding: 6px 16px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; }
.btn-cancel-sm { background: transparent; border: 1px solid #cbd5e1; padding: 6px 16px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; }

.dss-modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15,23,42,0.85); display: flex; justify-content: center; align-items: center; z-index: 5000; }
.dss-modal { background: #0f172a; color: white; padding: 30px; border-radius: 12px; width: 400px; text-align: center; border: 1px solid #334155; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
.dss-modal h3 { margin-top: 0; font-size: 16px; border-bottom: 1px solid #334155; padding-bottom: 15px; letter-spacing: 1px; }
.modal-footer { margin-top: 30px; display: flex; justify-content: center; gap: 20px; }
.btn-annulla { background: transparent; color: white; border: 1px solid #cbd5e1; padding: 10px 25px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-elimina { background: #ef4444; color: white; border: none; padding: 10px 25px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-annulla:hover { background: rgba(255,255,255,0.1); }
.btn-elimina:hover { background: #dc2626; }
</style>