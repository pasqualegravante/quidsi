<template>
  <div class="function-layout">
    <p class="connessione-text">Quali zone della città vengono isolate da questo scenario?</p>
    <button class="btn-calcola" @click="dssStore.calculateConnessione()">Visualizza Aree</button>
  </div>
</template>

<script>
import { useDssStore } from '../../../store/dssStore';

export default {
  name: 'ConnectivityForm',
  setup() {
    const dssStore = useDssStore();
    return { dssStore };
  }
}
</script>

<style scoped>
.btn-calcola { width: 100%; background: #f1f5f9; border: none; padding: 12px; border-radius: 8px; font-weight: bold; color: #64748b; cursor: pointer; margin-top: 10px; transition: 0.2s; }
.btn-calcola:hover { background: #e2e8f0; color: #1e293b; }
.connessione-text { text-align: center; font-size: 13px; color: #334155; line-height: 1.5; margin: 30px 0; }
</style>