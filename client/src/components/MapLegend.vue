<template>
  <div class="legenda-minimale">
    <div class="legenda-content">
      <span class="item"><i class="blue"></i> Rete Stradale</span>
      <span class="item"><i class="red"></i> Tratto Interrotto</span>
      
      <span class="item"><i class="green"></i> Percorso Ottimale</span>
      
      <span v-if="dssStore.connectedComponents && dssStore.connectedComponents.length" class="item">
        <i class="multi"></i> Aree Isolate
      </span>
    </div>
  </div>
</template>

<script>
import { useDssStore } from '../store/dssStore';

export default {
  name: 'MapLegend',
  setup() {
    const dssStore = useDssStore();
    return { dssStore };
  }
}
</script>

<style scoped>
.legenda-minimale { 
  position: absolute; 
  bottom: 20px; 
  left: 50%; 
  transform: translateX(-50%); 
  background: rgba(15, 23, 42, 0.9); 
  color: white; 
  padding: 8px 25px; 
  border-radius: 6px;
  z-index: 1000; 
  font-size: 11px; 
  font-weight: bold; 
  text-transform: uppercase; 
  border: 1px solid #334155; 
}

.legenda-content { 
  display: flex; 
  gap: 20px; 
}

.item { 
  display: flex; 
  align-items: center; 
  gap: 6px; 
  letter-spacing: 0.5px; 
}

i { 
  display: inline-block; 
  width: 12px; 
  height: 12px; 
  border-radius: 50%; 
}

.blue { background: #3b82f6; border: 2px solid white; }
.red { background: #ef4444; border: 2px solid white; }
.green { background: #22c55e; border: 2px solid white; }
.multi { background: #f59e0b; border: 2px solid white; }
</style>