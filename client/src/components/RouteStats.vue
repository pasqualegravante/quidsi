<template>
  <transition name="slide-fade">
    <div v-if="hasStats" class="route-stats-panel" :class="{ 'has-impact': dssStore.routeImpact }">
      <div class="stats-header">ANALISI PERCORSO</div>
      
      <div class="stats-main">
        <div class="stat-group">
          <span class="stat-label">Distanza</span>
          <div class="stat-value-row">
            <span class="stat-value">{{ dssStore.routeStats.distance }}</span>
            <span class="stat-unit">km</span>
          </div>
        </div>

        <div class="stat-divider"></div>

        <div class="stat-group">
          <span class="stat-label">Tempo Stimato</span>
          <div class="stat-value-row">
            <span class="stat-value">{{ dssStore.routeStats.duration }}</span>
            <span class="stat-unit">min</span>
          </div>
        </div>
      </div>

      <div v-if="dssStore.routeImpact" class="impact-panel">
        <div class="impact-title">IMPATTO VIABILITÀ</div>
        <div class="impact-badge" :class="impactClass">
          <span class="impact-icon">{{ impactIcon }}</span>
          <span class="impact-text">Ritardo: {{ dssStore.routeImpact.percent }}% ({{ dssStore.routeImpact.timeDiff }} min)</span>
        </div>
        <p class="impact-desc">Rispetto allo scenario senza cantieri.</p>
      </div>
    </div>
  </transition>
</template>

<script>
import { useDssStore } from '../store/dssStore';

export default {
  name: 'RouteStats',
  setup() {
    const dssStore = useDssStore();
    return { dssStore };
  },
  computed: {
    hasStats() {
      return this.dssStore.activeRoutePath.length > 0;
    },
    impactClass() {
      const impact = this.dssStore.routeImpact;
      if (!impact) return '';
      if (impact.isCritical) return 'critical';
      if (impact.isWarning) return 'warning';
      return 'minimal';
    },
    impactIcon() {
      const impact = this.dssStore.routeImpact;
      if (!impact) return '';
      if (impact.isCritical) return '🔴';
      if (impact.isWarning) return '🟠';
      return '🟢';
    }
  }
}
</script>

<style scoped>
.route-stats-panel {
  position: absolute; 
  top: 90px; /* <-- MODIFICATO: Spinto in basso sotto il selettore veicolo */
  right: 20px;
  background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px;
  width: 240px; padding: 16px; 
  z-index: 2000; /* <-- MODIFICATO: Assicura che stia sopra a tutto */
  color: white;
  box-shadow: 0 10px 25px rgba(0,0,0,0.3);
}

.stats-header { font-size: 10px; font-weight: 800; letter-spacing: 1.5px; margin-bottom: 12px; color: #94a3b8; }
.stats-main { display: flex; justify-content: space-between; align-items: center; }
.stat-group { display: flex; flex-direction: column; }
.stat-label { font-size: 11px; color: #94a3b8; margin-bottom: 2px; }
.stat-value { font-size: 24px; font-weight: 800; color: #10b981; }
.stat-unit { font-size: 12px; margin-left: 4px; color: #10b981; opacity: 0.8; }
.stat-divider { width: 1px; height: 30px; background: rgba(255,255,255,0.1); }

/* IMPACT STYLES */
.impact-panel { margin-top: 15px; padding-top: 15px; border-top: 1px dashed rgba(255,255,255,0.2); }
.impact-title { font-size: 9px; font-weight: 800; color: #94a3b8; margin-bottom: 8px; }
.impact-badge { display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: 8px; font-size: 11px; font-weight: 700; }

.impact-badge.critical { background: rgba(239, 68, 68, 0.2); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.3); }
.impact-badge.warning { background: rgba(245, 158, 11, 0.2); color: #fcd34d; border: 1px solid rgba(245, 158, 11, 0.3); }
.impact-badge.minimal { background: rgba(16, 185, 129, 0.2); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.3); }

.impact-desc { font-size: 9px; color: #64748b; margin-top: 6px; font-style: italic; }

.slide-fade-enter-active { transition: all 0.4s ease-out; }
.slide-fade-leave-active { transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1); }
.slide-fade-enter-from, .slide-fade-leave-to { transform: translateX(20px); opacity: 0; }
</style>