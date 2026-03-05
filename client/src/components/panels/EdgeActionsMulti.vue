<template>
  <div class="action-buttons">
    <button class="btn-red-light" @click="$emit('force-status', true)">Chiudi Selezionati</button>
    <button class="btn-green-light" @click="$emit('force-status', false)">Riapri Selezionati</button>

    <button class="btn-dark-blue" @click="$emit('set-weight')" title="(*) Next Version">
      Imposta Peso
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
.action-buttons { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
.btn-red-light { background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 8px; border: 1px solid #ef4444; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-green-light { background: #dcfce7; color: #166534; padding: 12px; border-radius: 8px; border: 1px solid #22c55e; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-red-light:hover { background: #fecaca; }
.btn-green-light:hover { background: #bbf7d0; }
.btn-dark-blue { background: #0f172a; color: white; padding: 12px; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; transition: background-color 0.2s; }
.btn-dark-blue:hover { background: #1e293b; }
</style>