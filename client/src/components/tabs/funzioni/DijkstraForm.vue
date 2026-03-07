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
.input-with-icon { display: flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 25px; padding: 10px 15px; margin-bottom: 12px; background: white; transition: 0.2s;}
.clickable-input { cursor: pointer; user-select: none; }
.clickable-input:hover { border-color: #94a3b8; background: #f8fafc; }

.active-selection { border-color: #3b82f6 !important; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }

.fake-input { margin-left: 10px; width: 100%; font-size: 13px; color: #94a3b8; white-space: normal; word-wrap: break-word; line-height: 1.3; font-family: 'Inter', sans-serif;}
.fake-input.filled { color: #0f172a; font-weight: 600; }
.location-icon { font-size: 16px; }

.btn-calcola { width: 100%; background: #f1f5f9; border: none; padding: 12px; border-radius: 8px; font-weight: bold; color: #94a3b8; cursor: pointer; margin-top: 10px; transition: 0.2s; }

.btn-calcola:hover:not(:disabled) { background: #e2e8f0; color: #64748b; }
.btn-calcola:disabled { opacity: 0.6; cursor: not-allowed; }
</style>