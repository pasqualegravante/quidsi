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
            <p>Genera report PDF dettagliati o esporta la rete in formato Shapefile.</p>
            <button class="fs-btn">CONFIGURA REPORT</button>
          </div>
          <div class="fs-card">
            <h3>Parametri Algoritmo</h3>
            <p>Configura le impedenze per il calcolo dei cammini minimi su Python.</p>
            <button class="fs-btn">IMPOSTA PESI</button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
/**
 * @file FullscreenMenu.vue
 * @description Modulo Overlay Amministrativo.
 * Predisposto per le iterazioni future del DSS, come JWT e Data Exporting.
 */
export default {
  name: 'FullscreenMenu',
  props: { isOpen: { type: Boolean, required: true } },
  emits: ['close']
}
</script>

<style scoped>
.fs-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.95); color: white; z-index: 3000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); }
.close-fs { position: absolute; top: 30px; right: 40px; background: none; border: 1px solid white; color: white; padding: 10px 20px; cursor: pointer; font-weight: bold; transition: all 0.2s; }
.close-fs:hover { background: white; color: #0f172a; }
.fs-content { width: 80%; max-width: 1200px; text-align: center; }
.fs-header { margin-bottom: 60px; }
.fs-header h1 { font-size: 3rem; letter-spacing: 4px; font-weight: 900; margin-bottom: 10px; }
.fs-header p { color: #94a3b8; font-size: 1.2rem; }
.fs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; }
.fs-card { background: rgba(255,255,255,0.05); padding: 40px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); transition: transform 0.3s ease; text-align: left; }
.fs-card:hover { transform: translateY(-5px); background: rgba(255,255,255,0.08); }
.fs-card h3 { color: #3b82f6; margin-top: 0; margin-bottom: 15px; font-size: 1.4rem; }
.fs-card p { font-size: 0.9rem; line-height: 1.6; color: #cbd5e1; min-height: 3rem; }
.fs-btn { margin-top: 20px; width: 100%; padding: 12px; background: #2563eb; color: white; border: none; font-weight: bold; cursor: pointer; border-radius: 6px; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.4s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>