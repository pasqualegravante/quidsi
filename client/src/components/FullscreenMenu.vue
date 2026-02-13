<template>
  <transition name="fade">
    <div v-if="isOpen" class="fs-overlay">
      <button class="close-fs" @click="$emit('close')">CHIUDI ×</button>
      
      <div class="fs-content">
        <header class="fs-header">
          <h1>PANNELLO GESTIONALE QUIDSI</h1>
          <p>Sistema di Supporto Decisionale - Comune di Trento</p>
        </header>

        <div class="fs-grid">
          
          <div class="fs-card">
            <h3>Gestione Progetti</h3>
            <p>Carica o salva scenari di viabilità predefiniti per analisi comparative.</p>
            <button class="fs-btn">NUOVO SCENARIO</button>
          </div>

          <div class="fs-card">
            <h3>Hub Esportazione</h3>
            <p>Genera report PDF dettagliati o esporta la rete in formato Shapefile/GeoJSON.</p>
            <button class="fs-btn">CONFIGURA REPORT</button>
          </div>

          <div class="fs-card">
            <h3>Parametri Algoritmo</h3>
            <p>Configura i pesi (impedenze) per il calcolo dei cammini minimi tramite Dijkstra.</p>
            <button class="fs-btn">IMPOSTA PESI</button>
          </div>

        </div>
      </div>
    </div>
  </transition>
</template>

<script>
/**
 * @component FullscreenMenu
 * @description Gestisce l'interfaccia di gestione globale del DSS. 
 * Fornisce un ambiente isolato per configurazioni che non richiedono l'interazione diretta con la mappa.
 */
export default {
  name: 'FullscreenMenu',
  props: {
    /** * @property {Boolean} isOpen 
     * Determina la visibilità dell'overlay tramite il sistema di transizioni di Vue.
     */
    isOpen: {
      type: Boolean,
      required: true
    }
  },
  emits: ['close'] // Segnala al padre la volontà di chiudere l'overlay
}
</script>

<style scoped>
/** * STILE OVERLAY E GLASSMORPHISM
 * Utilizzo di backdrop-filter per mantenere il contesto della mappa in sottofondo.
 */
.fs-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  /* Palette scura istituzionale con opacità elevata */
  background: rgba(10, 25, 47, 0.98);
  color: white;
  z-index: 2000; /* Priorità assoluta sopra ogni altro elemento UI */
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px); /* Effetto sfocatura per profondità visiva */
}

/* Posizionamento del comando di uscita */
.close-fs {
  position: absolute;
  top: 30px;
  right: 40px;
  background: none;
  border: 1px solid white;
  color: white;
  padding: 10px 20px;
  cursor: pointer;
  font-weight: bold;
  letter-spacing: 1px;
  transition: all 0.2s ease;
}

.close-fs:hover {
  background: white;
  color: #0a192f;
}

.fs-content {
  width: 80%;
  max-width: 1200px;
  text-align: center;
}

.fs-header {
  margin-bottom: 60px;
}

.fs-header h1 {
  font-size: 3rem;
  letter-spacing: 4px;
  font-weight: 900;
  text-transform: uppercase;
}

/** * LAYOUT GRID PER FUNZIONALITÀ
 * Struttura a tre colonne per una lettura rapida dei moduli.
 */
.fs-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
}

/* Card modulari con feedback all'hover */
.fs-card {
  background: rgba(255,255,255,0.05);
  padding: 40px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
  transition: transform 0.3s ease, background 0.3s ease;
}

.fs-card:hover {
  background: rgba(255,255,255,0.1);
  transform: translateY(-5px);
}

.fs-card h3 {
  margin-top: 0;
  color: #00d4ff; /* Colore d'accento per i titoli dei moduli */
  letter-spacing: 1px;
}

.fs-card p {
  font-size: 0.9rem;
  line-height: 1.6;
  color: #ccc;
  min-height: 3rem;
}

.fs-btn {
  margin-top: 20px;
  width: 100%;
  padding: 12px;
  background: #004dcf;
  color: white;
  border: none;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  border-radius: 4px;
}

/* Animazioni di transizione (Vue Transition API) */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>