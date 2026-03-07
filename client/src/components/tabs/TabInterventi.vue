<template>
  <div class="tab-pane">
    <div class="pane-header">
      <h3>Interventi attivi</h3>
      <button class="collapse-btn" @click="$emit('collapse')" title="Chiudi pannello">⮜</button>
    </div>
    
    <div class="pane-body">
      <ul class="interventi-list">
        <li 
          v-for="edge in dssStore.activeClosuresObjects" 
          :key="edge.id" 
          class="intervento-item"
          @click="dssStore.mapFocusId = edge.id"
        >
          <div class="intervento-info">
            <strong>TRATTO</strong> - "{{ edge.street }}"
          </div>
          <div class="intervento-actions">
            <button class="icon-btn delete-btn" @click.stop="dssStore.toggleEdgeStatus(edge.id)" title="Cancella">🗑️</button>
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
  emits: ['collapse'],
  setup() {
    const dssStore = useDssStore();
    return { dssStore };
  }
}
</script>

<style scoped>
.tab-pane { display: flex; flex-direction: column; height: 100%; width:100%;}

.pane-header { 
  display: flex; justify-content: space-between; align-items: center; 
  padding: 12px 15px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; 
}
.pane-header h3 { margin: 0; font-size: 14px; font-weight: bold; color: #0f172a; }

.collapse-btn { 
  background: #e2e8f0; color: #0f172a; border: none; width: 26px; height: 26px;
  display: flex; align-items: center; justify-content: center; cursor: pointer; 
  border-radius: 4px; font-weight: bold; transition: background 0.2s;
}
.collapse-btn:hover { background: #cbd5e1; }

.pane-body { padding: 15px; flex: 1; overflow-y: auto; }

.interventi-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }

/* 🔥 Ora il riquadro cambia stile al passaggio del mouse per far capire che è cliccabile */
.intervento-item { 
  display: flex; align-items: center; justify-content: space-between; 
  border: 1px solid #cbd5e1; padding: 8px 10px; border-radius: 4px; 
  background: white; cursor: pointer; transition: all 0.2s;
}
.intervento-item:hover { 
  border-color: #94a3b8; 
  background: #f8fafc; 
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

/* 🔥 Modificato per permettere al testo di andare a capo invece di essere tagliato */
.intervento-info { 
  flex: 1; 
  font-size: 11px; 
  color: #0f172a; 
  margin-right: 8px; 
  white-space: normal; 
  word-wrap: break-word; 
  line-height: 1.4;
}

.intervento-actions { display: flex; gap: 4px; }

.icon-btn { 
  border: 1px solid #cbd5e1; border-radius: 4px; width: 26px; height: 26px; 
  cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s;
}
.delete-btn { background: #1e293b; color: white; border-color: #1e293b;}
.delete-btn:hover { background: #dc2626; border-color: #dc2626; } 

.empty-state { font-size: 12px; color: #64748b; text-align: center; margin-top: 20px; }
</style>