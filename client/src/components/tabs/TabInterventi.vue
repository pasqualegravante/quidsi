<template>
  <div class="tab-pane">
    <div class="pane-header">
      <h3>Interventi attivi</h3>
      <button class="collapse-btn">⮜</button>
    </div>
    
    <div class="pane-body">
      <ul class="interventi-list">
        <li v-for="edge in dssStore.activeClosuresObjects" :key="edge.id" class="intervento-item">
          <div class="intervento-info">
            <strong>TRATTO</strong> - "{{ edge.street }}"
          </div>
          <div class="intervento-actions">
            <button class="icon-btn zoom-btn" @click="dssStore.mapFocusId = edge.id" title="Zoom">📍</button>
            <button class="icon-btn delete-btn" @click="dssStore.toggleEdgeStatus(edge.id)" title="Cancella">🗑️</button>
          </div>
        </li>
        <li v-if="!dssStore.activeClosuresObjects.length" class="empty-state">
          Nessun intervento attivo.
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { useDssStore } from '../../store/dssStore';

export default {
  name: 'TabInterventi',
  setup() {
    const dssStore = useDssStore();
    return { dssStore };
  }
}
</script>

<style scoped>
.tab-pane { display: flex; flex-direction: column; height: 100%; }
.pane-header { display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #f1f5f9; border-bottom: 1px solid #cbd5e1; }
.pane-header h3 { margin: 0; font-size: 14px; color: #0f172a; }
.collapse-btn { background: #e2e8f0; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px; font-weight: bold; }
.pane-body { padding: 20px; flex: 1; overflow-y: auto; }

.interventi-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.intervento-item { display: flex; align-items: center; justify-content: space-between; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 4px; background: white; }
.intervento-info { font-size: 11px; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 190px; }
.intervento-actions { display: flex; gap: 5px; }
.icon-btn { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; width: 28px; height: 28px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s;}
.icon-btn:hover { background: #e2e8f0; }
.delete-btn { background: #1e293b; color: white; border-color: #1e293b;}
.delete-btn:hover { background: #0f172a; }
.empty-state { font-size: 12px; color: #64748b; text-align: center; margin-top: 20px; }
</style>