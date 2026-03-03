<template>
  <div class="legenda-minimale">
    <div class="legenda-content">
      <span class="item"><i class="blue"></i> Rete Stradale</span>
      <span class="item"><i class="red"></i> Tratto Interrotto</span>
      <span class="item"><i class="green"></i> Percorso Dijkstra</span>
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
.legenda-minimale { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.9); color: white; padding: 12px 30px; border-radius: 8px; z-index: 1000; font-size: 11px; font-weight: bold; text-transform: uppercase; border: 1px solid #334155; }
.legenda-content { display: flex; gap: 20px; }
.item { display: flex; align-items: center; }
.item i { display: inline-block; width: 14px; height: 14px; border-radius: 3px; margin-right: 8px; }
.blue { background: #3b82f6; }
.red { background: #ef4444; border: 1px dashed white; }
.green { background: #10b981; }
.multi { background: linear-gradient(45deg, #f472b6, #8b5cf6, #06b6d4); }
</style>