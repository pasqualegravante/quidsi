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
.btn-calcola { width: 100%; background: #e2e8f0; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; font-weight: bold; color: #1e293b; cursor: pointer; margin-top: 10px; transition: 0.2s; }
.btn-calcola:hover { background: #cbd5e1; }
.connessione-text { text-align: center; font-size: 13px; color: #334155; line-height: 1.5; margin: 30px 0; }
</style>