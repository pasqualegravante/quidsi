<template>
  <div class="closures-widget" :class="{ 'is-empty': !closedStreets || closedStreets.length === 0 }">
    <div class="widget-header">
      <span class="title">INTERVENTI ATTIVI</span>
      <span class="count-badge">{{ closedStreets ? closedStreets.length : 0 }}</span>
    </div>

    <div class="widget-content">
      <div v-if="!closedStreets || closedStreets.length === 0" class="empty-state">
        Nessun blocco stradale rilevato.
      </div>
      
      <ul v-else class="closure-list">
        <li v-for="street in closedStreets" :key="street.id" class="closure-item">
          <div class="info">
            <span class="name">{{ street.name }}</span>
            <span class="details">COD: {{ street.id }}</span>
          </div>
          <div class="actions">
            <button class="btn-zoom" @click="$emit('zoom-to', street.id)" title="Individua">📍</button>
            <button class="btn-open" @click="$emit('reopen', street.id)" title="Riapri">🔓</button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ActiveClosures',
  // IL FIX È QUI: dobbiamo dichiarare esplicitamente cosa riceviamo dal padre
  props: {
    closedStreets: {
      type: Array,
      default: () => [] // Inizializza come array vuoto se non passato
    }
  },
  emits: ['zoom-to', 'reopen']
}
</script>

<style scoped>
.closures-widget {
  position: absolute;
  bottom: 20px; 
  left: 15px;
  width: 240px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  max-height: 220px;
  transition: all 0.3s ease;
}
.is-empty { opacity: 0.6; }
.widget-header { padding: 8px 12px; background: #0f172a; color: white; display: flex; justify-content: space-between; align-items: center; border-radius: 7px 7px 0 0; }
.title { font-size: 9px; font-weight: 900; letter-spacing: 0.5px; }
.count-badge { background: #ef4444; font-size: 9px; padding: 2px 6px; border-radius: 10px; font-weight: 800; }
.widget-content { overflow-y: auto; flex: 1; }
.empty-state { padding: 15px; font-size: 10px; color: #94a3b8; text-align: center; }
.closure-list { list-style: none; padding: 0; margin: 0; }
.closure-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; border-bottom: 1px solid #f1f5f9; }
.info { display: flex; flex-direction: column; }
.name { font-size: 10px; font-weight: 700; color: #1e293b; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.details { font-size: 8px; color: #94a3b8; }
.actions { display: flex; gap: 4px; }
.btn-zoom, .btn-open { background: white; border: 1px solid #e2e8f0; border-radius: 4px; padding: 4px; cursor: pointer; font-size: 10px; }
</style>