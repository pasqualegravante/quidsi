<template>
  <div class="action-buttons">
    
    <button v-if="!allStreetSegmentsSelected" class="btn-blue" @click="$emit('select-entire-street')">
      Seleziona intera VIA
    </button>

    <button v-if="isStreetPartiallyClosed" class="btn-green" @click="$emit('toggle-street', false)">Riapri intera VIA</button>
    <button v-else class="btn-red" @click="$emit('toggle-street', true)">Chiudi intera VIA</button>
    
    <template v-if="showSingleEdgeAction">
      <button :class="isSingleEdgeClosed ? 'btn-green-light' : 'btn-red-light'" @click="$emit('toggle-edge')">
        {{ isSingleEdgeClosed ? 'Apri Tratto' : 'Chiudi Tratto' }}
      </button>
    </template>

    <button class="btn-dark-blue" @click="$emit('set-weight')" title="(*) Next Version">
      Imposta Peso
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
    allStreetSegmentsSelected: Boolean // Nuova prop
  },
  emits: ['toggle-street', 'toggle-edge', 'set-weight', 'select-entire-street']
}
</script>

<style scoped>
.action-buttons { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }

/* Stile per il nuovo bottone Seleziona */
.btn-blue { background: #3b82f6; color: white; padding: 12px; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-blue:hover { background: #2563eb; }

.btn-red { background: #ef4444; color: white; padding: 12px; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-green { background: #22c55e; color: white; padding: 12px; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-red:hover { background: #dc2626; }
.btn-green:hover { background: #16a34a; }

.btn-red-light { background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 8px; border: 1px solid #ef4444; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-green-light { background: #dcfce7; color: #166534; padding: 12px; border-radius: 8px; border: 1px solid #22c55e; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-red-light:hover { background: #fca5a5; }
.btn-green-light:hover { background: #bbf7d0; }

.btn-dark-blue { background: #1e293b; color: white; padding: 12px; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-dark-blue:hover { background: #334155; }
</style>