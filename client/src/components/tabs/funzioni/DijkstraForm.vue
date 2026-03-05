<template>
  <div class="function-layout">
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

    <button class="btn-calcola" @click="dssStore.calculateDijkstra()" :disabled="!dssStore.routingStartPoint || !dssStore.routingEndPoint">
      Calcola Percorso
    </button>
  </div>
</template>

<script>
import { useDssStore } from '../../../store/dssStore';

export default {
  name: 'DijkstraForm',
  setup() {
    const dssStore = useDssStore();
    return { dssStore };
  }
}
</script>

<style scoped>
.input-with-icon { display: flex; align-items: center; border: 1px solid #94a3b8; border-radius: 20px; padding: 8px 15px; margin-bottom: 15px; background: white; transition: 0.2s;}
.clickable-input { cursor: pointer; user-select: none; border-color: #cbd5e1; }
.clickable-input:hover { border-color: #64748b; background: #f8fafc; }
.active-selection { border-color: #f59e0b !important; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2); background: #fffbeb !important; }
.fake-input { margin-left: 10px; width: 100%; font-size: 13px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: 'Inter', sans-serif;}
.fake-input.filled { color: #0f172a; font-weight: bold; }
.location-icon { font-size: 16px; }

.alfa-controller { margin: 25px 0 15px 0; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
.alfa-controller label { display: block; font-size: 11px; color: #475569; margin-bottom: 8px; }
.alfa-controller label strong { color: #2563eb; }
.alfa-slider { width: 100%; cursor: pointer; }
.alfa-labels { display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; margin-top: 5px; font-weight: bold; text-transform: uppercase; }

.btn-calcola { width: 100%; background: #e2e8f0; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; font-weight: bold; color: #1e293b; cursor: pointer; margin-top: 10px; transition: 0.2s; }
.btn-calcola:hover:not(:disabled) { background: #cbd5e1; }
.btn-calcola:disabled { opacity: 0.5; cursor: not-allowed; }
</style>