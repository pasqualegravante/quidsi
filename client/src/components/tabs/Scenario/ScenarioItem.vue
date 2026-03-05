<template>
  <li class="scenario-row" :class="{ 'active-scenario': isActive }">
    <div class="scenario-main-info">
      <div v-if="!isEditing">
        <span class="scen-label">
          {{ scen.label }} 
          <strong v-if="isActive && isModified" class="mod-tag">[MODIFICATO]</strong>
        </span>
        <p class="scen-desc">{{ scen.description || 'Nessuna descrizione.' }}</p>
      </div>

      <div v-else class="edit-mode-container">
        <input v-model="tempLabel" class="edit-input" placeholder="Nome scenario" />
        <textarea v-model="tempDesc" class="edit-textarea" placeholder="Descrizione..."></textarea>
        <div class="edit-actions">
          <button class="btn-cancel-sm" @click="cancelEdit">Annulla</button>
          <button class="btn-save-sm" @click="confirmSave">Salva</button>
        </div>
      </div>
    </div>
    
    <div class="scenario-actions" v-if="!isEditing">
      <button 
        v-if="isActive" 
        @click="$emit('save-state')" 
        title="Salva modifiche rete"
        :class="{ 'needs-saving': isModified }"
      >💾</button>

      <button @click="startEdit" title="Modifica Nome">✏️</button>
      <button @click="$emit('select', scen.id)" title="Seleziona e Carica">📂</button>
      <button @click="$emit('duplicate', scen.id)" title="Duplica">📋</button>
      <button @click="$emit('delete', scen)" title="Elimina">🗑️</button>
    </div>
  </li>
</template>

<script>
export default {
  name: 'ScenarioItem',
  props: {
    scen: Object,
    isActive: Boolean,
    isModified: Boolean
  },
  // Aggiunto 'save-state' agli emits
  emits: ['save-info', 'select', 'duplicate', 'delete', 'save-state'],
  data() {
    return {
      isEditing: false,
      tempLabel: '',
      tempDesc: ''
    };
  },
  methods: {
    startEdit() {
      this.tempLabel = this.scen.label;
      this.tempDesc = this.scen.description || '';
      this.isEditing = true;
    },
    cancelEdit() {
      this.isEditing = false;
    },
    confirmSave() {
      this.$emit('save-info', { id: this.scen.id, label: this.tempLabel, desc: this.tempDesc });
      this.isEditing = false;
    }
  }
}
</script>

<style scoped>
.scenario-row { border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; background: #f8fafc; margin-bottom: 12px; list-style: none; transition: all 0.2s ease; }
.scenario-row.active-scenario { background: #eff6ff; border-color: #bfdbfe; border-left: 5px solid #2563eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
.scen-label { font-weight: 800; font-size: 14px; color: #0f172a; display: block; }
.scen-desc { font-size: 12px; color: #64748b; margin: 5px 0 0 0; }
.mod-tag { color: #ef4444; font-size: 11px; margin-left: 5px; border: 1px solid #ef4444; padding: 2px 4px; border-radius: 4px; }
.scenario-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }
.scenario-actions button { background: white; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer; font-size: 16px; padding: 6px 10px; transition: 0.2s; }
.scenario-actions button:hover { background: #f1f5f9; border-color: #94a3b8; }

/* Classe dinamica per quando ci sono modifiche da salvare */
.needs-saving { background: #fee2e2 !important; border-color: #ef4444 !important; animation: pulse-red 1.5s infinite; }
@keyframes pulse-red {
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  70% { box-shadow: 0 0 0 4px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

.edit-mode-container { display: flex; flex-direction: column; gap: 8px; }
.edit-input { width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #2563eb; font-weight: bold; font-size: 13px; outline: none; box-sizing: border-box; }
.edit-textarea { width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #cbd5e1; font-size: 11px; resize: none; height: 60px; outline: none; box-sizing: border-box; }
.edit-actions { display: flex; gap: 10px; justify-content: flex-end; }
.btn-save-sm { background: #2563eb; color: white; border: none; padding: 6px 16px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; }
.btn-cancel-sm { background: transparent; border: 1px solid #cbd5e1; padding: 6px 16px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; }
</style>