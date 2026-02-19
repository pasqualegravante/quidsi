<template>
  <div class="map-legend">
    <div class="legend-header">LEGENDA RETE</div>
    <div class="legend-body">
      <div class="legend-item"><span class="line route"></span><span class="label">Percorso Ottimale</span></div>
      <div class="legend-item"><span class="line closed"></span><span class="label">Tratto Interrotto</span></div>
      <div class="legend-item"><span class="line selected"></span><span class="label">Strada Selezionata</span></div>
      <div class="legend-item"><span class="line oneway"></span><span class="label">Senso Unico</span></div>
      <div class="legend-item"><span class="line twoway"></span><span class="label">Doppio Senso</span></div>
    </div>
    
    <div class="legend-footer">
      <label class="print-mode-toggle">
        <input type="checkbox" v-model="dssStore.printMode">
        <span>Modalità Stampa (Nascondi rete)</span>
      </label>
    </div>
  </div>
</template>

<script>
import { useDssStore } from '../store/dssStore';

export default {
  name: 'MapLegend',
  setup() {
    const dssStore = useDssStore();
    return { dssStore };
  }
}
</script>

<style scoped>
.map-legend { position: absolute; bottom: 30px; right: 20px; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(8px); padding: 12px; border-radius: 10px; box-shadow: 0 8px 32px rgba(0,0,0,0.15); border: 1px solid rgba(226, 232, 240, 0.8); z-index: 1010; width: auto; min-width: 160px; pointer-events: auto; }
.legend-header { font-size: 10px; font-weight: 900; color: #64748b; letter-spacing: 1.2px; margin-bottom: 8px; text-transform: uppercase; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; pointer-events: none;}
.legend-body { display: flex; flex-direction: column; gap: 8px; pointer-events: none;}
.legend-item { display: flex; align-items: center; gap: 12px; }
.label { font-size: 11px; font-weight: 700; color: #1e293b; }
.line { width: 20px; height: 4px; border-radius: 2px; flex-shrink: 0; }

.route { background: #10b981; height: 5px; }
.closed { background: #ef4444; border: 1px dashed white; }
.selected { background: #f59e0b; height: 5px; }
.oneway { background: #3b82f6; }
.twoway { background: #94a3b8; }

/* NUOVO CSS: Modalità Stampa */
.legend-footer { margin-top: 12px; padding-top: 8px; border-top: 1px solid #f1f5f9; }
.print-mode-toggle { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 10px; font-weight: 800; color: #475569; }
.print-mode-toggle input { cursor: pointer; accent-color: #0f172a; width: 14px; height: 14px;}
</style>