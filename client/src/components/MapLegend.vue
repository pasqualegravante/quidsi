<template>
  <div class="map-legend">
    <div class="legend-header">LEGENDA RETE</div>
    <div class="legend-body">
      <div class="legend-item">
        <span class="line route"></span>
        <span class="label">Percorso Ottimale</span>
      </div>
      <div class="legend-item">
        <span class="line closed"></span>
        <span class="label">Tratto Interrotto</span>
      </div>
      <div class="legend-item">
        <span class="line selected"></span>
        <span class="label">Strada Selezionata</span>
      </div>
      <div class="legend-item">
        <span class="line oneway"></span>
        <span class="label">Senso Unico</span>
      </div>
      <div class="legend-item">
        <span class="line twoway"></span>
        <span class="label">Doppio Senso</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MapLegend'
}
</script>

<style scoped>
.map-legend {
  position: absolute;
  bottom: 30px;
  right: 20px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  padding: 12px;
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
  border: 1px solid rgba(226, 232, 240, 0.8);
  /* Z-INDEX: Sopra la mappa (1000) ma sotto la Sidebar (1100) */
  z-index: 1010; 
  width: auto;
  min-width: 160px;
  pointer-events: none;
}

.legend-header {
  font-size: 10px;
  font-weight: 900;
  color: #64748b;
  letter-spacing: 1.2px;
  margin-bottom: 8px;
  text-transform: uppercase;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 4px;
}

.legend-body { display: flex; flex-direction: column; gap: 8px; }
.legend-item { display: flex; align-items: center; gap: 12px; }
.label { font-size: 11px; font-weight: 700; color: #1e293b; }
.line { width: 20px; height: 4px; border-radius: 2px; flex-shrink: 0; }

/* Colori sincronizzati col Grafo */
.route { background: #10b981; height: 5px; }
.closed { background: #ef4444; border: 1px dashed white; }
.selected { background: #f59e0b; height: 5px; }
.oneway { background: #3b82f6; }
.twoway { background: #94a3b8; }
</style>