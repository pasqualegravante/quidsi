<template>
  <transition name="slide">
    <aside v-if="isOpen" class="dss-side-panel">
      
      <div class="panel-header">
        <h2 class="panel-title">ISPEZIONE ARCO</h2>
        <button class="btn-close" @click="$emit('close')">×</button>
      </div>

      <div class="panel-content" v-if="selectedEdge">
        
        <div class="data-header">
          <span class="street-name">{{ selectedEdge.street || 'Strada senza nome' }}</span>
          <span class="id-badge">ID: {{ selectedEdge.id }}</span>
        </div>

        <div class="data-group">
          <label>Regime Viabilistico</label>
          <div class="value">{{ selectedEdge.oneWay === 1 ? 'Senso Unico' : 'Doppio Senso' }}</div>
        </div>

        <div class="divider-line"></div>

        <h3 class="section-title">ALTERAZIONE SCENARIO (CANTIERI)</h3>
        
        <div class="simulation-actions-stack">
          <button :class="['btn-massive', selectedEdge.isClosed ? 'btn-reopen' : 'btn-close']" @click="$emit('simulate-entire')">
            {{ selectedEdge.isClosed ? 'RIAPRI INTERA VIA' : 'CHIUDI INTERA VIA (BLOCCO TOTALE)' }}
          </button>
          
          <button :class="['btn-outline', selectedEdge.isClosed ? 'text-green' : 'text-red']" @click="$emit('simulate-portion')">
            {{ selectedEdge.isClosed ? 'Riapri solo questo frammento' : 'Chiudi solo questo frammento esatto' }}
          </button>
        </div>

      </div>

    </aside>
  </transition>
</template>

<script>
/**
 * @file Sidebar.vue
 * @description Modulo UI di Ispezione Topografica.
 * Gestisce la visualizzazione delle feature map e la simulazione visiva
 * delle interruzioni viarie (che vengono poi passate come impedenze infinite a Python).
 */
export default {
  name: 'Sidebar',
  props: { 
    isOpen: { type: Boolean, default: false }, 
    selectedEdge: { type: Object, default: null } 
  },
  emits: ['close', 'simulate-portion', 'simulate-entire']
}
</script>

<style scoped>
.dss-side-panel { position: absolute; top: 80px; right: 20px; bottom: auto; width: 340px; background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); display: flex; flex-direction: column; z-index: 1100; border: 1px solid #e2e8f0; }
.panel-header { padding: 15px 20px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border-radius: 12px 12px 0 0;}
.panel-title { font-size: 10px; font-weight: 900; color: #64748b; letter-spacing: 1px; margin: 0; }
.close-btn { background: none; border: none; font-size: 24px; color: #cbd5e1; cursor: pointer; line-height: 1; padding: 0; }
.panel-content { padding: 25px 20px; }
.data-header { margin-bottom: 25px; }
.street-name { display: block; font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 8px; }
.id-badge { font-size: 11px; background: #e2e8f0; padding: 4px 8px; border-radius: 6px; color: #475569; font-family: 'JetBrains Mono', monospace; font-weight: 600; }
.data-group label { display: block; font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 5px; }
.value { font-size: 14px; font-weight: 600; color: #0f172a; }
.divider-line { height: 1px; background: #e2e8f0; margin: 25px 0; }
.section-title { font-size: 10px; font-weight: 800; color: #ef4444; margin-bottom: 15px; }
.simulation-actions-stack { display: flex; flex-direction: column; gap: 10px; }
.btn-massive { width: 100%; padding: 16px; border: none; border-radius: 8px; font-weight: 800; font-size: 11px; cursor: pointer; transition: 0.2s; color: white; }
.btn-close { background: #ef4444; box-shadow: 0 4px 10px rgba(239,68,68,0.3); } .btn-close:hover { background: #dc2626; transform: translateY(-2px); }
.btn-reopen { background: #10b981; box-shadow: 0 4px 10px rgba(16,185,129,0.3); } .btn-reopen:hover { background: #059669; transform: translateY(-2px); }
.btn-outline { background: transparent; border: 1px dashed #cbd5e1; padding: 12px; border-radius: 8px; font-size: 10px; font-weight: 700; cursor: pointer; transition: 0.2s; }
.btn-outline:hover { background: #f8fafc; border-style: solid; }
.text-red { color: #ef4444; } .text-green { color: #10b981; }
.slide-enter-active, .slide-leave-active { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-enter-from, .slide-leave-to { transform: translateX(380px); opacity: 0; }
</style>