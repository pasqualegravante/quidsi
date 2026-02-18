<template>
  <div class="closures-widget" :class="{ 'is-empty': !dssStore.activeClosuresObjects.length }">
    <div class="widget-header">
      <span class="title">INTERVENTI ATTIVI</span>
      <span class="count-badge">{{ dssStore.activeClosuresObjects.length }}</span>
    </div>

    <div class="widget-content">
      <div v-if="!dssStore.activeClosuresObjects.length" class="empty-state-container">
        <div class="empty-state-icon">🚧</div>
        <h4 class="empty-state-title">Nessuna chiusura attiva</h4>
        <p class="empty-state-text">
          Clicca su un arco stradale nella mappa per simulare un blocco del traffico o un cantiere.
        </p>
      </div>
      
      <ul v-else class="closure-list">
        <li v-for="street in dssStore.activeClosuresObjects" :key="street.id" class="closure-item">
          <div class="info">
            <span class="name">{{ street.name }}</span>
            <span class="details">COD: {{ street.id }}</span>
          </div>
          <div class="actions">
            <button class="btn-zoom" @click="dssStore.setFocusEdge(street.id)" title="Individua">📍</button>
            <button class="btn-open" @click="dssStore.toggleClosure(street.id)" title="Riapri">🔓</button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { useDssStore } from '../store/dssStore'; // Importa il "cervello"

export default {
  name: 'ActiveClosures',
  // In Vue 3, questo è il modo per agganciare lo store
  setup() {
    const dssStore = useDssStore();
    return { dssStore };
  }
}
</script>

<style scoped>
/* Lascia esattamente gli stessi stili CSS che avevi prima */
.closures-widget { position: absolute; bottom: 20px; left: 15px; width: 240px; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.15); z-index: 1000; display: flex; flex-direction: column; max-height: 220px; transition: all 0.3s ease; }
.is-empty { opacity: 0.85; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
.widget-header { padding: 8px 12px; background: #0f172a; color: white; display: flex; justify-content: space-between; align-items: center; border-radius: 7px 7px 0 0; }
.title { font-size: 9px; font-weight: 900; letter-spacing: 0.5px; }
.count-badge { background: #ef4444; font-size: 9px; padding: 2px 6px; border-radius: 10px; font-weight: 800; }
.widget-content { overflow-y: auto; flex: 1; }
.empty-state-container { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 15px; text-align: center; background: #f8fafc; }
.empty-state-icon { font-size: 24px; margin-bottom: 8px; opacity: 0.6; filter: grayscale(0.5); }
.empty-state-title { margin: 0 0 6px 0; font-size: 11px; font-weight: 800; color: #475569; }
.empty-state-text { margin: 0; font-size: 10px; color: #64748b; line-height: 1.4; }
.closure-list { list-style: none; padding: 0; margin: 0; }
.closure-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; border-bottom: 1px solid #f1f5f9; }
.info { display: flex; flex-direction: column; }
.name { font-size: 10px; font-weight: 700; color: #1e293b; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.details { font-size: 8px; color: #94a3b8; }
.actions { display: flex; gap: 4px; }
.btn-zoom, .btn-open { background: white; border: 1px solid #e2e8f0; border-radius: 4px; padding: 4px; cursor: pointer; font-size: 10px; transition: all 0.2s; }
.btn-zoom:hover, .btn-open:hover { background: #f1f5f9; border-color: #cbd5e1; }
</style>