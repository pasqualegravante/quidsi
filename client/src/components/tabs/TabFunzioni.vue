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

      <DijkstraForm v-if="selectedFunction === 'dijkstra'" />
      <ConnectivityForm v-if="selectedFunction === 'connessione'" />

    </div>
  </div>
</template>

<script>
import DijkstraForm from './funzioni/DijkstraForm.vue';
import ConnectivityForm from './funzioni/ConnectivityForm.vue';

export default {
  name: 'TabFunzioni',
  components: {
    DijkstraForm,
    ConnectivityForm
  },
  emits: ['collapse'],
  data() {
    return {
      selectedFunction: 'dijkstra'
    };
  }
}
</script>

<style scoped>
/* Solo gli stili strutturali e del dropdown restano qui */
.tab-pane { display: flex; flex-direction: column; height: 100%; }
.pane-header { display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #f1f5f9; border-bottom: 1px solid #cbd5e1; }
.pane-header h3 { margin: 0; font-size: 14px; color: #0f172a; }
.collapse-btn { background: #e2e8f0; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px; font-weight: bold; }
.pane-body { padding: 20px; flex: 1; overflow-y: auto; }

.dropdown-group { border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; margin-bottom: 25px; }
.dropdown-group label { display: block; font-size: 10px; color: #64748b; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px;}
.custom-select { width: 100%; border: none; outline: none; background: transparent; font-weight: bold; color: #0f172a; cursor: pointer; font-size: 14px;}
</style>