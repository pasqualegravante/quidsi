<template>
  <div class="routing-widget">
    <div class="widget-header">
      <h3>CALCOLO PERCORSO</h3>
    </div>

    <div class="widget-body">
      <div :class="['input-group', { 'is-active': activeMode === 'start' }]">
        <div class="icon-a">A</div>
        <div class="input-fake" @click="$emit('toggle-mode', 'start')">
          {{ startPoint ? startPoint.street || 'Arco ' + startPoint.id : 'Seleziona partenza...' }}
        </div>
        <button class="btn-target" @click="$emit('toggle-mode', 'start')" title="Seleziona dalla mappa">
          🎯
        </button>
      </div>

      <div class="connector-line"></div>

      <div :class="['input-group', { 'is-active': activeMode === 'end' }]">
        <div class="icon-b">B</div>
        <div class="input-fake" @click="$emit('toggle-mode', 'end')">
          {{ endPoint ? endPoint.street || 'Arco ' + endPoint.id : 'Seleziona arrivo...' }}
        </div>
        <button class="btn-target" @click="$emit('toggle-mode', 'end')" title="Seleziona dalla mappa">
          🎯
        </button>
      </div>
    </div>

    <div v-if="activeMode" class="selection-hint">
      Clicca su una strada nella mappa per confermare...
    </div>

    <div class="widget-footer">
      <button 
        class="btn-calc" 
        :disabled="!startPoint || !endPoint || activeMode"
        @click="$emit('calculate')"
      >
        ▶ AVVIA SIMULAZIONE
      </button>
    </div>
  </div>
</template>

<script>
/**
 * @file RoutingWidget.vue
 * @description Modulo UI fluttuante delegato esclusivamente alla configurazione 
 * dell'algoritmo Dijkstra. Fornisce UX feedback per le operazioni "Click-to-Target".
 */
export default {
  name: 'RoutingWidget',
  props: {
    /** @type {Object|null} Payload nodo di partenza */
    startPoint: { type: Object, default: null },
    /** @type {Object|null} Payload nodo di destinazione */
    endPoint: { type: Object, default: null },
    /** @type {String|null} Bandiera per informare che stiamo attendendo un click su mappa */
    activeMode: { type: String, default: null } 
  },
  emits: ['toggle-mode', 'calculate']
}
</script>

<style scoped>
.routing-widget { position: absolute; top: 80px; left: 20px; width: 320px; background: white; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.2); z-index: 1000; overflow: hidden; border: 1px solid #e2e8f0; }
.widget-header { background: #0f172a; padding: 12px 20px; color: white; }
.widget-header h3 { margin: 0; font-size: 11px; font-weight: 800; letter-spacing: 1px; }
.widget-body { padding: 20px; position: relative; }
.input-group { display: flex; align-items: center; gap: 10px; background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 5px; transition: 0.2s; }
.input-group.is-active { border-color: #f59e0b; background: #fffbeb; box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.2); }
.icon-a, .icon-b { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 11px; flex-shrink: 0; }
.icon-a { background: #10b981; } .icon-b { background: #8b5cf6; }
.input-fake { flex: 1; font-size: 12px; color: #334155; font-weight: 600; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.btn-target { background: white; border: 1px solid #cbd5e1; border-radius: 6px; width: 32px; height: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
.btn-target:hover { background: #f1f5f9; border-color: #94a3b8; }
.connector-line { width: 2px; height: 15px; background: #cbd5e1; margin: 5px 0 5px 16px; }
.selection-hint { text-align: center; font-size: 11px; color: #f59e0b; font-weight: 700; padding: 0 20px 10px; animation: pulse-text 1.5s infinite; }
.widget-footer { padding: 15px 20px; background: #f1f5f9; border-top: 1px solid #e2e8f0; }
.btn-calc { width: 100%; padding: 12px; background: #2563eb; color: white; border: none; border-radius: 6px; font-weight: 800; font-size: 11px; cursor: pointer; transition: 0.2s; }
.btn-calc:disabled { background: #cbd5e1; cursor: not-allowed; }
.btn-calc:not(:disabled):hover { background: #1d4ed8; transform: translateY(-1px); }
@keyframes pulse-text { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
</style>