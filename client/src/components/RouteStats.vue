<template>
  <div v-if="dssStore.activeRoutePath && dssStore.activeRoutePath.length > 0" class="route-stats-panel">
    <div class="stat-item">
      <span class="label">DISTANZA TOTALE</span>
      <span class="value">{{ dssStore.routeStats.distance }} km</span>
    </div>
    <div class="stat-divider"></div>
    <div class="stat-item">
      <span class="label">TEMPO STIMATO</span>
      <span class="value">{{ dssStore.routeStats.duration }} min</span>
    </div>
  </div>
</template>

<script setup>
import { useDssStore } from '../store/dssStore';

// Con <script setup>, tutto ciò che dichiari qui è AUTOMATICAMENTE disponibile nel template in alto!
const dssStore = useDssStore();
</script>

<style scoped>
.route-stats-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 12px 20px;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  display: flex;
  gap: 20px;
  z-index: 1000;
  border: 2px solid #10b981;
}
.stat-item { display: flex; flex-direction: column; }
.label { font-size: 9px; font-weight: 800; color: #64748b; letter-spacing: 0.5px; }
.value { font-size: 18px; font-weight: 900; color: #0f172a; }
.stat-divider { width: 1px; background: #e2e8f0; }
</style>