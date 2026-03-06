<template>
  <li 
    class="scenario-row" 
    :class="{ 'active-scenario': isActive }"
    @click="$emit('select', scen.id)"
  >
    <div class="scenario-main-info">
      <div v-if="!isEditing">
        <span class="scen-label">
          {{ scen.label }} 
          <strong v-if="isActive && isModified" class="mod-tag">[DA SALVARE]</strong>
        </span>
        <p class="scen-desc">{{ scen.description || 'Nessuna descrizione presente.' }}</p>
      </div>

      <div v-else class="edit-mode-container" @click.stop>
        <input v-model="tempLabel" class="edit-input" @keyup.enter="confirmSave" />
        <textarea v-model="tempDesc" class="edit-textarea"></textarea>
        <div class="edit-actions">
          <button class="btn-cancel-sm" @click="cancelEdit">Annulla</button>
          <button class="btn-save-sm" @click="confirmSave">Ok</button>
        </div>
      </div>
    </div>
    
    <div class="scenario-actions" v-if="!isEditing" @click.stop>
      <button 
        v-if="isActive" 
        @click="$emit('save-state')" 
        :class="{ 'needs-saving': isModified }"
        title="Salva modifiche"
      >💾</button>
      <button @click="startEdit" title="Rinomina">✏️</button>
      <button @click="$emit('duplicate', scen.id)" title="Duplica">📋</button>
      <button @click="$emit('delete', scen)" class="btn-delete" title="Elimina">🗑️</button>
    </div>
  </li>
</template>

<script>
export default {
  name: 'ScenarioItem',
  props: { scen: Object, isActive: Boolean, isModified: Boolean },
  emits: ['select', 'duplicate', 'delete', 'save-info', 'save-state'],
  data() {
    return { isEditing: false, tempLabel: '', tempDesc: '' };
  },
  methods: {
    startEdit() {
      this.isEditing = true;
      this.tempLabel = this.scen.label;
      this.tempDesc = this.scen.description;
    },
    cancelEdit() { this.isEditing = false; },
    confirmSave() {
      if (this.tempLabel.trim()) {
        this.$emit('save-info', { id: this.scen.id, label: this.tempLabel, desc: this.tempDesc });
      }
      this.isEditing = false;
    }
  }
}
</script>

<style scoped>
.scenario-row { padding: 15px; border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: 0.2s; position: relative; }
.scenario-row:hover { background: #f8fafc; }
.active-scenario { background: #eff6ff !important; border-left: 4px solid #3b82f6; }
.scen-label { font-weight: bold; color: #1e293b; display: block; font-size: 14px; }
.scen-desc { font-size: 12px; color: #64748b; margin: 4px 0 0 0; }
.mod-tag { color: #ef4444; font-size: 10px; margin-left: 5px; }
.scenario-actions { display: flex; gap: 8px; margin-top: 10px; justify-content: flex-end; }
.scenario-actions button { background: white; border: 1px solid #cbd5e1; border-radius: 4px; padding: 5px 8px; cursor: pointer; transition: 0.2s; }
.scenario-actions button:hover { background: #f1f5f9; }
.needs-saving { background: #fee2e2 !important; border-color: #ef4444 !important; animation: pulse-red 1.5s infinite; }
@keyframes pulse-red { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 70% { box-shadow: 0 0 0 4px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
.edit-mode-container { display: flex; flex-direction: column; gap: 8px; }
.edit-input, .edit-textarea { padding: 8px; border: 1px solid #3b82f6; border-radius: 4px; font-family: inherit; }
.edit-actions { display: flex; gap: 5px; justify-content: flex-end; }
</style>