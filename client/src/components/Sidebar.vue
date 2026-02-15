<template>
  <transition name="slide">
    <aside v-if="isOpen" class="dss-side-panel">
      
      <div class="panel-header">
        <h2 class="panel-title">DATI TECNICI ARCO</h2>
        <button class="close-btn" @click="$emit('close')" title="Chiudi pannello">×</button>
      </div>

      <div class="panel-content" v-if="selectedEdge">
        
        <div class="data-group">
          <label>Codice Identificativo</label>
          <div class="value-id">{{ selectedEdge.id }}</div>
        </div>

        <div class="data-group">
          <label>Toponimo</label>
          <div class="value">{{ selectedEdge.street || 'Dato non censito' }}</div>
        </div>

        <div class="data-group">
          <label>Regime Viabilistico</label>
          <div class="value">{{ selectedEdge.oneWay === 1 ? 'Senso Unico' : 'Doppio Senso' }}</div>
        </div>

        <div class="simulation-box">
          <button class="btn-primary" @click="$emit('simulate')">
            SIMULA INTERRUZIONE STRADALE
          </button>
          <p class="hint">Disattiva temporaneamente questo segmento dal calcolo del grafo (Dijkstra).</p>
        </div>

      </div>
      
      <section v-else class="empty-state">
        <p>Seleziona una strada dalla mappa per vederne i dettagli.</p>
      </section>

      <div class="panel-footer">
        <button class="btn-outline" @click="$emit('clear')">RESET MAPPA</button>
      </div>

    </aside>
  </transition>
</template>

<script>
/**
 * @file Sidebar.vue
 * @description Presentational Component dedicato alla visualizzazione analitica
 * dei metadati estratti dal GIS. Inoltra le interazioni utente al livello genitore (App.vue).
 */
export default {
  name: 'Sidebar',
  props: {
    /** Determina il rendering e l'animazione di entrata/uscita del pannello */
    isOpen: { type: Boolean, default: false },
    /** Riferimento reattivo ai dati dell'arco attualmente in analisi */
    selectedEdge: { type: Object, default: null }
  },
  /** Dichiarazione degli eventi (Event Bus pattern) propagati al Componente Padre */
  emits: ['close', 'simulate', 'clear']
}
</script>

<style scoped>
/* ... (MANTENERE IL TUO BLOCCO <style> PRECEDENTE ESATTAMENTE COME ERA) ... */
</style>
<style scoped>
.dss-side-panel {
  position: absolute; top: 80px; right: 20px; bottom: 20px;
  width: 320px; background: white; border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.15); display: flex; flex-direction: column;
  z-index: 1000; border: 1px solid #e2e8f0;
}

.panel-header {
  padding: 20px; border-bottom: 1px solid #f1f5f9;
  display: flex; justify-content: space-between; align-items: center;
}

.panel-title { font-size: 10px; font-weight: 800; color: #94a3b8; letter-spacing: 1px; margin: 0; }
.close-btn { background: none; border: none; font-size: 24px; color: #cbd5e1; cursor: pointer; line-height: 1; padding: 0; }
.close-btn:hover { color: #ef4444; }

.panel-content { padding: 25px; flex: 1; overflow-y: auto; }
.empty-state { padding: 25px; text-align: center; color: #94a3b8; font-size: 13px; }

.data-group { margin-bottom: 25px; }
.data-group label { display: block; font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 5px; }
.value { font-size: 15px; font-weight: 600; color: #0f172a; }
.value-id { font-family: 'JetBrains Mono', monospace; font-size: 18px; color: #2563eb; font-weight: 800; }

.simulation-box { margin-top: 40px; padding-top: 25px; border-top: 1px dashed #cbd5e1; }
.btn-primary {
  width: 100%; background: #2563eb; color: white; border: none;
  padding: 14px; border-radius: 8px; font-weight: 800; font-size: 11px;
  cursor: pointer; transition: background 0.2s;
}
.btn-primary:hover { background: #1d4ed8; }
.hint { font-size: 10px; color: #94a3b8; margin-top: 12px; line-height: 1.4; }

.panel-footer { padding: 20px; background: #f8fafc; border-radius: 0 0 12px 12px; border-top: 1px solid #f1f5f9; }
.btn-outline {
  width: 100%; background: white; border: 1px solid #e2e8f0;
  padding: 12px; border-radius: 6px; font-size: 10px; font-weight: 700;
  color: #64748b; cursor: pointer; transition: 0.2s;
}
.btn-outline:hover { background: #f1f5f9; color: #0f172a; }

.slide-enter-active, .slide-leave-active { transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
.slide-enter-from, .slide-leave-to { transform: translateX(350px); opacity: 0; }
</style>