<template>
  <div class="action-buttons">
    
    <button v-if="!allStreetSegmentsSelected" class="btn-blue" @click="$emit('select-entire-street')">
      ⤡ Seleziona l'intera VIA
    </button>

    <button v-if="!showSingleEdgeAction" class="btn-outline-blue" @click="$emit('select-single-edge')">
      ⤢ Riduci al tratto iniziale
    </button>

    <button v-if="isStreetPartiallyClosed" class="btn-green" @click="$emit('toggle-street', false)">🔓 Riapri intera VIA</button>
    <button v-else class="btn-red" @click="$emit('toggle-street', true)">🔒 Chiudi intera VIA</button>
    
    <template v-if="showSingleEdgeAction">
      <button :class="isSingleEdgeClosed ? 'btn-green-light' : 'btn-red-light'" @click="$emit('toggle-edge')">
        {{ isSingleEdgeClosed ? '🔓 Apri solo questo tratto' : '🔒 Chiudi solo questo tratto' }}
      </button>
    </template>

    <button class="btn-wip" @click="$emit('set-weight')" title="Feature in progress">
      🚧 Imposta Peso (In Progress)
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
    allStreetSegmentsSelected: Boolean 
  },
  emits: ['toggle-street', 'toggle-edge', 'set-weight', 'select-entire-street', 'select-single-edge']
}
</script>

<style scoped>
/* CSS RIMASTO IDENTICO AL PRECEDENTE */
.action-buttons { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
.btn-blue { background: #3b82f6; color: white; padding: 12px; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-blue:hover { background: #2563eb; }
.btn-outline-blue { background: transparent; color: #3b82f6; padding: 12px; border-radius: 8px; border: 2px solid #3b82f6; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-outline-blue:hover { background: #eff6ff; }
.btn-red { background: #ef4444; color: white; padding: 12px; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-green { background: #22c55e; color: white; padding: 12px; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-red:hover { background: #dc2626; }
.btn-green:hover { background: #16a34a; }
.btn-red-light { background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 8px; border: 1px solid #ef4444; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-green-light { background: #dcfce7; color: #166534; padding: 12px; border-radius: 8px; border: 1px solid #22c55e; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-red-light:hover { background: #fca5a5; }
.btn-green-light:hover { background: #bbf7d0; }
.btn-wip { background: #f1f5f9; color: #64748b; padding: 12px; border-radius: 8px; border: 2px dashed #cbd5e1; cursor: help; font-weight: bold; transition: 0.2s; }
.btn-wip:hover { background: #e2e8f0; border-color: #94a3b8; color: #475569; }
</style>