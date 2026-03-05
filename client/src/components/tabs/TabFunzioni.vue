<template>
  <div class="tab-pane">
    <div class="pane-header">
      <h3>Applica funzione</h3>
      <button class="collapse-btn" @click="$emit('collapse')" title="Chiudi pannello">⮜</button>
    </div>
    
    <div class="pane-body">
      <div class="dropdown-group">
        <label>Seleziona funzione</label>
        <select v-model="selectedFunction" class="custom-select">
          <option value="dijkstra">Dijkstra</option>
          <option value="connessione">Connessione</option>
        </select>
      </div>

      <div v-if="selectedFunction === 'dijkstra'" class="function-layout">
        
        <div 
          class="input-with-icon clickable-input" 
          :class="{ 'active-selection': dssStore.selectionMode === 'start' }"
          @click="dssStore.setSelectionMode('start')"
        >
          <span class="location-icon">📍</span>
          <div :class="['fake-input', { 'filled': dssStore.routingStartPoint }]">
            {{ dssStore.routingStartPoint ? dssStore.routingStartPoint.street : 'Clicca per Partenza (A)' }}
          </div>
        </div>

        <div 
          class="input-with-icon clickable-input" 
          :class="{ 'active-selection': dssStore.selectionMode === 'end' }"
          @click="dssStore.setSelectionMode('end')"
        >
          <span class="location-icon">📍</span>
          <div :class="['fake-input', { 'filled': dssStore.routingEndPoint }]">
            {{ dssStore.routingEndPoint ? dssStore.routingEndPoint.street : 'Clicca per Destinazione (B)' }}
          </div>
        </div>

        <div class="alfa-controller">
          <label>Parametro Alfa: <strong>{{ dssStore.alfa.toFixed(1) }}</strong></label>
          <input type="range" min="0" max="1" step="0.1" v-model.number="dssStore.alfa" class="alfa-slider" />
          <div class="alfa-labels">
            <span>Distanza</span>
            <span>Tempo</span>
          </div>
        </div>

        <button class="btn-calcola" @click="eseguiCalcolo" :disabled="!dssStore.routingStartPoint || !dssStore.routingEndPoint">
          Calcola Percorso
        </button>
      </div>

      <div v-if="selectedFunction === 'connessione'" class="function-layout">
        <p class="connessione-text">Quali zone della città vengono isolate da questo scenario?</p>
        <button class="btn-calcola" @click="eseguiCalcolo">Visualizza Aree</button>
      </div>
    </div>
  </div>
</template>

<script>
import { useDssStore } from '../../store/dssStore';

export default {
  name: 'TabFunzioni',
  // Dichiariamo l'evento emesso per avvisare il componente padre
  emits: ['collapse'],
  setup() {
    const dssStore = useDssStore();
    return { dssStore };
  },
  data() {
    return {
      selectedFunction: 'dijkstra' // Valore di default
    };
  },
  methods: {
    // Esegue la funzione selezionata in base alla scelta dell'utente
    eseguiCalcolo() {
      if (this.selectedFunction === 'dijkstra') {
        this.dssStore.calculateDijkstra(this.dssStore.routingStartPoint.id, this.dssStore.routingEndPoint.id);
      } else if (this.selectedFunction === 'connessione') {
        this.dssStore.calculateConnessione();
      }
    }
  }
}
</script>

<style scoped>
/* Stili layout e header */
.tab-pane { display: flex; flex-direction: column; height: 100%; }
.pane-header { display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #f1f5f9; border-bottom: 1px solid #cbd5e1; }
.pane-header h3 { margin: 0; font-size: 14px; color: #0f172a; }
.collapse-btn { background: #e2e8f0; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px; font-weight: bold; }
.pane-body { padding: 20px; flex: 1; overflow-y: auto; }

/* Stili dropdown selettore */
.dropdown-group { border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; margin-bottom: 25px; }
.dropdown-group label { display: block; font-size: 10px; color: #64748b; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px;}
.custom-select { width: 100%; border: none; outline: none; background: transparent; font-weight: bold; color: #0f172a; cursor: pointer; font-size: 14px;}

/* Stili input finti per selezione A/B */
.input-with-icon { display: flex; align-items: center; border: 1px solid #94a3b8; border-radius: 20px; padding: 8px 15px; margin-bottom: 15px; background: white; transition: 0.2s;}
.clickable-input { cursor: pointer; user-select: none; border-color: #cbd5e1; }
.clickable-input:hover { border-color: #64748b; background: #f8fafc; }
.active-selection { border-color: #f59e0b !important; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2); background: #fffbeb !important; }
.fake-input { margin-left: 10px; width: 100%; font-size: 13px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: 'Inter', sans-serif;}
.fake-input.filled { color: #0f172a; font-weight: bold; }
.location-icon { font-size: 16px; }

/* Stili controller Alfa */
.alfa-controller { margin: 25px 0 15px 0; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
.alfa-controller label { display: block; font-size: 11px; color: #475569; margin-bottom: 8px; }
.alfa-controller label strong { color: #2563eb; }
.alfa-slider { width: 100%; cursor: pointer; }
.alfa-labels { display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; margin-top: 5px; font-weight: bold; text-transform: uppercase; }

/* Stili bottoni calcolo */
.btn-calcola { width: 100%; background: #e2e8f0; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; font-weight: bold; color: #1e293b; cursor: pointer; margin-top: 10px; transition: 0.2s; }
.btn-calcola:hover:not(:disabled) { background: #cbd5e1; }
.btn-calcola:disabled { opacity: 0.5; cursor: not-allowed; }
.connessione-text { text-align: center; font-size: 13px; color: #334155; line-height: 1.5; margin: 30px 0; }
</style>