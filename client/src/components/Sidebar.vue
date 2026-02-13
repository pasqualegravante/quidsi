<template>
  <transition name="slide">
    <aside v-if="isOpen" class="dss-side-panel">
      
      <div class="panel-header">
        <h2 class="panel-title">DETTAGLI INFRASTRUTTURA</h2>
        <button class="close-button" @click="$emit('close')" title="Chiudi pannello">×</button>
      </div>

      <div class="panel-content">
        <section v-if="selectedEdge" class="info-section">
          
          <div class="data-badge">
            <span class="id-label">ID ARCO:</span>
            <span class="id-value">{{ selectedEdge.id }}</span>
          </div>

          <div class="data-grid">
            <div class="data-item">
              <span class="label">Toponimo</span>
              <span class="value">{{ selectedEdge.street || 'Non disponibile' }}</span>
            </div>
            <div class="data-item">
              <span class="label">Tipologia</span>
              <span class="value">{{ selectedEdge.oneWay === 1 ? 'Senso Unico' : 'Doppio Senso' }}</span>
            </div>
          </div>

          <div class="action-zone">
            <button class="btn-simulate" @click="$emit('simulate')">
              Simula Interruzione
            </button>
            <p class="helper-text">L'algoritmo calcolerà i percorsi alternativi basandosi sulla gerarchia stradale.</p>
          </div>
        </section>

        <section v-else class="empty-state">
          <p>Seleziona un segmento del grafo per visualizzare i dati tecnici.</p>
        </section>

        <div class="panel-footer">
          <div class="footer-row">
            <span>Coordinate System</span>
            <span>EPSG:25832</span>
          </div>
          <button class="btn-reset" @click="$emit('clear')">Svuota Mappa</button>
        </div>
      </div>
    </aside>
  </transition>
</template>

<script>
/**
 * @component Sidebar
 * @description Gestisce il pannello laterale destro per l'analisi dettagliata degli archi.
 * Riceve i dati dalla selezione cartografica e permette l'attivazione di scenari simulativi.
 */
export default {
  name: 'Sidebar',
  props: {
    /** @property {Boolean} isOpen - Controlla la visibilità del pannello */
    isOpen: {
      type: Boolean,
      default: false
    },
    /** @property {Object|null} selectedEdge - Dati tecnici dell'arco selezionato */
    selectedEdge: {
      type: Object,
      default: null
    }
  },
  emits: ['close', 'simulate', 'clear'] // Eventi emessi verso il coordinatore (App.vue)
}
</script>

<style scoped>
/**
 * STILE PANNELLO LATERALE (DSS Standard)
 */
.dss-side-panel {
  position: absolute;
  top: 70px;
  right: 20px;
  bottom: 30px;
  width: 320px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
  z-index: 2000;
  border: 1px solid #e0e0e0;
}

/* Intestazione e controllo di chiusura */
.panel-header {
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
}

.panel-title {
  font-size: 11px;
  font-weight: 800;
  color: #666;
  letter-spacing: 0.5px;
  margin: 0;
  text-transform: uppercase;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  color: #ccc;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  transition: color 0.2s ease;
}

.close-button:hover {
  color: #ff5252; /* Feedback cromatico per azione distruttiva/chiusura */
}

/* Layout del contenuto */
.panel-content {
  padding: 25px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Display metadati */
.data-badge {
  background: #f8f9fa;
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.id-label { font-size: 10px; font-weight: 700; color: #999; }
.id-value { font-family: 'JetBrains Mono', monospace; font-weight: bold; color: #004dcf; }

.data-item {
  margin-bottom: 15px;
}

.label { display: block; font-size: 10px; color: #aaa; text-transform: uppercase; margin-bottom: 4px; }
.value { display: block; font-size: 14px; font-weight: 600; color: #333; }

/* Area simulazione */
.action-zone {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px dashed #eee;
}

.btn-simulate {
  width: 100%;
  padding: 14px;
  background: #004dcf;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn-simulate:hover { background: #003db3; }

.helper-text { font-size: 10px; color: #999; margin-top: 10px; line-height: 1.4; }

/* Gestione footer e reset */
.panel-footer {
  margin-top: auto;
}

.footer-row {
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  color: #ccc;
  margin-bottom: 15px;
}

.btn-reset {
  width: 100%;
  background: none;
  border: 1px solid #eee;
  padding: 8px;
  font-size: 10px;
  color: #666;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-reset:hover { background: #f8f9fa; color: #333; }

/* Animazioni di transizione (Slide-in da destra) */
.slide-enter-active, .slide-leave-active { transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
.slide-enter-from, .slide-leave-to { transform: translateX(350px); opacity: 0; }
</style>