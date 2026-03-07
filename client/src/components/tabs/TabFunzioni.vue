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
          <option value="dijkstra">Calcolo percorso ottimale</option>
          <option value="connessione">Verifica connessione</option>
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
.tab-pane { display: flex; flex-direction: column; height: 100%; width:100%;}

.pane-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  padding: 12px 15px; 
  background: #f8fafc; 
  border-bottom: 1px solid #e2e8f0; 
}

.pane-header h3 { margin: 0; font-size: 14px; font-weight: bold; color: #0f172a; }

.collapse-btn { 
  background: #e2e8f0; 
  color: #0f172a;
  border: none; 
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer; 
  border-radius: 4px; 
  font-weight: bold; 
  transition: background 0.2s;
}
.collapse-btn:hover { background: #cbd5e1; }

.pane-body { padding: 15px; flex: 1; overflow-y: auto; }

.dropdown-group { 
  background: white;
  border: 1px solid #cbd5e1; 
  padding: 8px 10px; 
  border-radius: 6px; 
  margin-bottom: 20px; 
}

.dropdown-group label { 
  display: block; 
  font-size: 10px; 
  color: #64748b; 
  margin-bottom: 4px; 
  text-transform: uppercase; 
  letter-spacing: 0.5px;
}

.custom-select { 
  width: 100%; 
  border: none; 
  outline: none; 
  background: transparent; 
  font-weight: 600; 
  color: #0f172a; 
  cursor: pointer; 
  font-size: 13px;
}
</style>