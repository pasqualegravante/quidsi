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
        <button class="btn-target" @click="$emit('toggle-mode', 'start')" title="Seleziona dalla mappa">🎯</button>
      </div>

      <div class="connector-wrapper">
        <div class="connector-line"></div>
        <button class="btn-swap" @click="dssStore.swapRoutePoints()" title="Inverti Partenza e Arrivo" :disabled="!startPoint || !endPoint">⇅</button>
      </div>

      <div :class="['input-group', { 'is-active': activeMode === 'end' }]">
        <div class="icon-b">B</div>
        <div class="input-fake" @click="$emit('toggle-mode', 'end')">
          {{ endPoint ? endPoint.street || 'Arco ' + endPoint.id : 'Seleziona arrivo...' }}
        </div>
        <button class="btn-target" @click="$emit('toggle-mode', 'end')" title="Seleziona dalla mappa">🎯</button>
      </div>
    </div>

    <div v-if="activeMode" class="selection-hint">
      Clicca su una strada nella mappa per confermare...
    </div>

    <div class="widget-footer">
      <button 
        class="btn-calc" 
        :disabled="!startPoint || !endPoint || activeMode || isSamePoint"
        :class="{ 'is-invalid': isSamePoint }"
        @click="$emit('calculate')"
      >
        {{ isSamePoint ? 'PUNTI COINCIDENTI' : 'AVVIA SIMULAZIONE' }}
      </button>

      <button 
        v-if="dssStore.activeRoutePath.length > 0" 
        class="btn-ordinanza" 
        @click="showModal = true"
      >
        📜 GENERA TESTO ORDINANZA
      </button>
    </div>

    <transition name="fade">
      <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
        <div class="modal-content">
          <div class="modal-header">
            <h4>BOZZA ORDINANZA VIABILISTICA</h4>
            <button class="btn-close-modal" @click="showModal = false">×</button>
          </div>
          <div class="modal-body">
            <textarea readonly v-model="formattedItinerary" class="itinerary-textarea"></textarea>
          </div>
          <div class="modal-actions">
            <button class="btn-copy-large" @click="copyItinerary">📋 COPIA TESTO NEGLI APPUNTI</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { useDssStore } from '../store/dssStore';
import { uiStore } from '../store/uiStore';

export default {
  name: 'RoutingWidget',
  setup() {
    const dssStore = useDssStore();
    return { dssStore, uiStore };
  },
  props: {
    startPoint: { type: Object, default: null },
    endPoint: { type: Object, default: null },
    activeMode: { type: String, default: null } 
  },
  emits: ['toggle-mode', 'calculate'],
  data() {
    return {
      showModal: false
    };
  },
  computed: {
    isSamePoint() {
      return this.startPoint && this.endPoint && String(this.startPoint.id) === String(this.endPoint.id);
    },
    // Genera il testo completo formattato
    formattedItinerary() {
      const header = "ORDINANZA DI DEVIAZIONE VIABILISTICA\nPercorso alternativo consigliato:\n\n";
      const body = this.dssStore.textualItinerary.map((s, i) => `${i + 1}. ${s}`).join('\n');
      return header + body;
    }
  },
  methods: {
    async copyItinerary() {
      try {
        await navigator.clipboard.writeText(this.formattedItinerary);
        this.uiStore.showToast('Testo ordinanza copiato negli appunti!', 'success');
        this.showModal = false; // Chiude la modale dopo aver copiato
      } catch (err) {
        this.uiStore.showToast('Errore durante la copia', 'error');
      }
    }
  }
}
</script>

<style scoped>
/* Stili base del widget inalterati */
.routing-widget { position: absolute; top: 100px; left: 15px; width: 320px; background: white; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.2); z-index: 1000; border: 1px solid #e2e8f0; }
.widget-header { background: #0f172a; padding: 12px 20px; color: white; border-radius: 11px 11px 0 0; }
.widget-header h3 { margin: 0; font-size: 11px; font-weight: 800; letter-spacing: 1px; }
.widget-body { padding: 20px; position: relative; }
.input-group { display: flex; align-items: center; gap: 10px; background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 5px; transition: 0.2s; }
.input-group.is-active { border-color: #f59e0b; background: #fffbeb; box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.2); }
.icon-a, .icon-b { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 11px; flex-shrink: 0; }
.icon-a { background: #10b981; } .icon-b { background: #8b5cf6; }
.input-fake { flex: 1; font-size: 12px; color: #334155; font-weight: 600; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.btn-target { background: white; border: 1px solid #cbd5e1; border-radius: 6px; width: 32px; height: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
.btn-target:hover { background: #f1f5f9; border-color: #94a3b8; }

.connector-wrapper { display: flex; align-items: center; gap: 10px; margin-left: 16px; position: relative; height: 24px;}
.connector-line { width: 2px; height: 24px; background: #cbd5e1; position: absolute; left: 0;}
.btn-swap { margin-left: 15px; background: white; border: 1px solid #cbd5e1; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 12px; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.05); color: #475569;}
.btn-swap:hover:not(:disabled) { background: #f1f5f9; border-color: #94a3b8; color: #0f172a;}
.btn-swap:disabled { opacity: 0.5; cursor: not-allowed; }

.selection-hint { text-align: center; font-size: 11px; color: #f59e0b; font-weight: 700; padding: 0 20px 10px; animation: pulse-text 1.5s infinite; }
.widget-footer { padding: 15px 20px; background: #f1f5f9; border-top: 1px solid #e2e8f0; border-radius: 0 0 11px 11px;}
.btn-calc { width: 100%; padding: 12px; background: #2563eb; color: white; border: none; border-radius: 6px; font-weight: 800; font-size: 11px; cursor: pointer; transition: 0.2s; }
.btn-calc:disabled { background: #cbd5e1; cursor: not-allowed; opacity: 0.9; box-shadow: none; transform: none; }
.btn-calc.is-invalid { background: #ef4444; color: white; }
.btn-calc:not(:disabled):hover { background: #1d4ed8; transform: translateY(-1px); }

/* NUOVO: Pulsante Ordinanza */
.btn-ordinanza { margin-top: 10px; width: 100%; padding: 10px; background: white; border: 1px dashed #2563eb; color: #2563eb; border-radius: 6px; font-weight: 800; font-size: 10px; cursor: pointer; transition: 0.2s; }
.btn-ordinanza:hover { background: #eff6ff; border-style: solid; }

/* NUOVO: Stili Modale */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; }
.modal-content { background: white; width: 450px; border-radius: 12px; box-shadow: 0 20px 50px rgba(0,0,0,0.3); display: flex; flex-direction: column; overflow: hidden; border: 1px solid #e2e8f0; }
.modal-header { padding: 15px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
.modal-header h4 { margin: 0; font-size: 12px; font-weight: 800; color: #0f172a; letter-spacing: 0.5px; }
.btn-close-modal { background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer; line-height: 1; transition: 0.2s; }
.btn-close-modal:hover { color: #ef4444; }
.modal-body { padding: 20px; background: white; }
.itinerary-textarea { width: 100%; height: 250px; padding: 15px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; font-family: 'JetBrains Mono', monospace, sans-serif; font-size: 12px; color: #334155; resize: none; outline: none; line-height: 1.5; }
.modal-actions { padding: 15px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; }
.btn-copy-large { width: 100%; padding: 14px; background: #10b981; color: white; border: none; border-radius: 6px; font-weight: 800; font-size: 12px; cursor: pointer; transition: 0.2s; }
.btn-copy-large:hover { background: #059669; transform: translateY(-1px); }

/* Transizione Modale */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@keyframes pulse-text { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
</style>