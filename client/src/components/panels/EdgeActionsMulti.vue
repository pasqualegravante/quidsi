<template>
  <div class="action-buttons">
    <button class="btn-red-light" @click="$emit('force-status', true)">Chiudi Selezionati</button>
    <button class="btn-green-light" @click="$emit('force-status', false)">Riapri Selezionati</button>

    <button class="btn-wip" @click="$emit('set-weight')" title="Feature in progress">
      Imposta Peso (In Progress)
    </button>
  </div>
</template>

<script>
export default {
  name: 'EdgeActionsMulti',
  emits: ['force-status', 'set-weight']
}
</script>

<style scoped>
/* CSS IDENTICO */
.action-buttons { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
.btn-red-light { background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 8px; border: 1px solid #ef4444; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-green-light { background: #dcfce7; color: #166534; padding: 12px; border-radius: 8px; border: 1px solid #22c55e; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-red-light:hover { background: #fca5a5; }
.btn-green-light:hover { background: #bbf7d0; }
.btn-wip { background: #f1f5f9; color: #64748b; padding: 12px; border-radius: 8px; border: 2px dashed #cbd5e1; cursor: help; font-weight: bold; transition: 0.2s; }
.btn-wip:hover { background: #e2e8f0; border-color: #94a3b8; color: #475569; }
</style>