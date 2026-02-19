<template>
  <div class="vehicle-selector shadow-lg">
    <div class="selector-title">PROFILO MEZZO</div>
    <div class="options-grid">
      <button 
        v-for="p in profiles" 
        :key="p.id"
        :class="['profile-btn', { active: dssStore.vehicleProfile === p.id }]"
        @click="updateProfile(p.id)"
      >
        <span class="icon">{{ p.icon }}</span>
        <span class="label">{{ p.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { useDssStore } from '../store/dssStore';

const dssStore = useDssStore();

const profiles = [
  { id: 'light', label: 'Leggero', icon: '🚗' },
  { id: 'heavy', label: 'Pesante', icon: '🚛' },
  { id: 'emergency', label: 'Emergenza', icon: '🚑' }
];

function updateProfile(id) {
  dssStore.vehicleProfile = id;
  // Se c'è già un percorso, ricalcolalo subito col nuovo profilo
  if (dssStore.activeRoutePath.length > 0) {
    dssStore.executeDijkstra();
  }
}
</script>

<style scoped>
.vehicle-selector {
  position: absolute;
  top: 110px; /* Sotto le statistiche */
  right: 20px;
  background: white;
  padding: 10px;
  border-radius: 12px;
  z-index: 1000;
  width: 180px;
  border: 1px solid #e2e8f0;
}
.selector-title {
  font-size: 9px;
  font-weight: 800;
  color: #64748b;
  margin-bottom: 8px;
  text-align: center;
  letter-spacing: 1px;
}
.options-grid { display: flex; flex-direction: column; gap: 5px; }
.profile-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid #f1f5f9;
  border-radius: 8px;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.2s;
}
.profile-btn:hover { background: #f1f5f9; }
.profile-btn.active {
  background: #0f172a;
  color: white;
  border-color: #0f172a;
}
.icon { font-size: 16px; }
.label { font-size: 11px; font-weight: 600; }
</style>