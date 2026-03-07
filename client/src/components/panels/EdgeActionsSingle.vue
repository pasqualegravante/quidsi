<template>
  <div class="action-buttons">
    <button v-if="!allStreetSegmentsSelected" class="btn-blue" @click="$emit('select-entire-street')">
      Espandi all'intera VIA
    </button>

    <button v-if="!showSingleEdgeAction && canRestoreSingle" class="btn-outline-blue" @click="$emit('select-single-edge')">
      Riduci al tratto iniziale
    </button>

    <template v-if="isMultiSelection">
      <button class="btn-red" @click="$emit('toggle-bulk', true)">Chiudi tratti selezionati</button>
      <button class="btn-green" @click="$emit('toggle-bulk', false)">Riapri tratti selezionati</button>
    </template>

    <template v-else>
      <button :class="isSingleEdgeClosed ? 'btn-green' : 'btn-red'" @click="$emit('toggle-edge')">
        {{ isSingleEdgeClosed ? 'Apri Tratto' : 'Chiudi Tratto' }}
      </button>
    </template>

    <button class="btn-wip" @click="$emit('set-weight')">
      Imposta Peso (In Progress)
    </button>
  </div>
</template>

<script>
export default {
  name: 'EdgeActionsSingle',
  props: {
    isStreetPartiallyClosed: Boolean,
    isSingleEdgeClosed: Boolean,
    showSingleEdgeAction: Boolean,
    allStreetSegmentsSelected: Boolean,
    isMultiSelection: Boolean,
    canRestoreSingle: Boolean // Nuova prop di controllo
  },
  emits: ['toggle-bulk', 'toggle-edge', 'set-weight', 'select-entire-street', 'select-single-edge']
}
</script>

<style scoped>
.action-buttons { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
.btn-blue { background: #3b82f6; color: white; padding: 12px; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; }
.btn-outline-blue { background: transparent; color: #3b82f6; padding: 12px; border-radius: 8px; border: 2px solid #3b82f6; cursor: pointer; font-weight: bold; }
.btn-red { background: #ef4444; color: white; padding: 12px; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; }
.btn-green { background: #22c55e; color: white; padding: 12px; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; }
.btn-wip { background: #f1f5f9; color: #64748b; padding: 12px; border-radius: 8px; border: 2px dashed #cbd5e1; cursor: help; font-weight: bold; }
</style>