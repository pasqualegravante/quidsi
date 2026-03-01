<template>
  <div class="sidebar-left-wrapper">
    <div class="vertical-tabs">
      <button 
        :class="['tab-btn', { active: activeTab === 'funzioni' }]" 
        @click="activeTab = 'funzioni'">
        Applica funzione
      </button>
      <button 
        :class="['tab-btn', { active: activeTab === 'interventi' }]" 
        @click="activeTab = 'interventi'">
        Interventi Attivi
      </button>
      <button 
        :class="['tab-btn', { active: activeTab === 'archivio' }]" 
        @click="activeTab = 'archivio'">
        Archivio Scenari
      </button>
    </div>

    <div class="tab-content-area">
      
      <div v-if="activeTab === 'funzioni'" class="tab-pane">
        <div class="pane-header">
          <h3>Applica funzione</h3>
          <button class="collapse-btn">⮜</button>
        </div>
        
        <div class="pane-body">
          <div class="dropdown-group">
            <label>Seleziona funzione</label>
            <select v-model="selectedFunction" class="custom-select">
              <option value="dijkstra">Dijkstra</option>
              <option value="connessione">Connessione</option>
            </select>
          </div>

          <div v-if="selectedFunction === 'dijkstra'" class="function-layout">
            <div class="input-with-icon">
              <span class="location-icon">📍</span>
              <input type="text" placeholder="Partenza" readonly />
            </div>
            <div class="input-with-icon">
              <span class="location-icon">📍</span>
              <input type="text" placeholder="Destinazione" readonly />
            </div>
            <button class="btn-calcola" @click="eseguiCalcolo">Calcola</button>
          </div>

          <div v-if="selectedFunction === 'connessione'" class="function-layout">
            <p class="connessione-text">
              quali zone della città vengono isolate da questo scenario di chiusure?
            </p>
            <button class="btn-calcola" @click="eseguiCalcolo">Visualizza</button>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'interventi'" class="tab-pane">
        <div class="pane-header">
          <h3>Interventi attivi</h3>
          <button class="collapse-btn">⮜</button>
        </div>
        
        <div class="pane-body">
          <ul class="interventi-list">
            <li v-for="edge in dssStore.activeClosuresObjects" :key="edge.id" class="intervento-item">
              <div class="intervento-info">
                <strong>{{ edge.isEntireStreet ? 'VIA' : 'TRATTO' }}</strong> - "{{ edge.name }}"
              </div>
              <div class="intervento-actions">
                <button class="icon-btn zoom-btn" title="Zoom">📍</button>
                <button class="icon-btn delete-btn" title="Cancella" @click="dssStore.toggleClosure(edge)">🗑️</button>
              </div>
            </li>
            <li v-if="!dssStore.activeClosuresObjects.length" class="empty-state">
              Nessun intervento attivo.
            </li>
          </ul>
        </div>
      </div>

      <div v-if="activeTab === 'archivio'" class="tab-pane">
         <div class="pane-header">
          <h3>Archivio Scenari</h3>
          <button class="collapse-btn">⮜</button>
        </div>
        <div class="pane-body">
          <button class="btn-calcola" style="margin-bottom: 15px;">Nuovo scenario</button>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
import { useDssStore } from '../store/dssStore';
import { onMounted } from 'vue';

export default {
  name: 'SidebarLeft',
  setup() {
    const dssStore = useDssStore();

    // Carica gli scenari all'avvio
    onMounted(() => {
      dssStore.fetchAllScenarios();
    });

    return { dssStore };
  },
  data() {
    return {
      activeTab: 'funzioni',
      selectedFunction: 'dijkstra',
      startPoint: '',
      endPoint: ''
    };
  },
  methods: {
    eseguiCalcolo() {
      if (this.selectedFunction === 'dijkstra') {
        this.dssStore.calculateDijkstra(this.startPoint, this.endPoint);
      } else if (this.selectedFunction === 'connessione') {
        this.dssStore.calculateConnessione();
      }
    },
    caricaScenario(id) {
      this.dssStore.selectScenario(id);
    }
  }
}
</script>

<style scoped>
.sidebar-left-wrapper { display: flex; height: 100%; background: #f8fafc; border-right: 1px solid #cbd5e1; z-index: 1000; position: relative; }

/* Schede Verticali */
.vertical-tabs { display: flex; flex-direction: column; width: 45px; background: #e2e8f0; border-right: 1px solid #cbd5e1; }
.tab-btn { writing-mode: vertical-rl; transform: rotate(180deg); padding: 20px 10px; cursor: pointer; border: none; background: transparent; font-weight: bold; color: #475569; border-left: 3px solid transparent; transition: 0.2s; letter-spacing: 1px; }
.tab-btn:hover { background: rgba(255,255,255,0.5); }
.tab-btn.active { background: white; border-left-color: #2563eb; color: #0f172a; }

/* Area Contenuto */
.tab-content-area { width: 320px; background: white; display: flex; flex-direction: column; }
.pane-header { display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #f1f5f9; border-bottom: 1px solid #cbd5e1; }
.pane-header h3 { margin: 0; font-size: 14px; color: #0f172a; }
.collapse-btn { background: #e2e8f0; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px; font-weight: bold; }
.pane-body { padding: 20px; flex: 1; overflow-y: auto; }

/* Applica Funzione Styles */
.dropdown-group { border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; margin-bottom: 25px; }
.dropdown-group label { display: block; font-size: 10px; color: #64748b; margin-bottom: 5px; }
.custom-select { width: 100%; border: none; outline: none; background: transparent; font-weight: bold; color: #0f172a; cursor: pointer; }
.input-with-icon { display: flex; align-items: center; border: 1px solid #94a3b8; border-radius: 20px; padding: 8px 15px; margin-bottom: 15px; }
.input-with-icon input { border: none; outline: none; margin-left: 10px; width: 100%; }
.btn-calcola { width: 100%; background: #e2e8f0; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 10px; }
.btn-calcola:hover { background: #cbd5e1; }
.connessione-text { text-align: center; font-size: 13px; color: #334155; line-height: 1.5; margin: 30px 0; }

/* Interventi Attivi Styles */
.interventi-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.intervento-item { display: flex; align-items: center; justify-content: space-between; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 4px; background: white; }
.intervento-info { font-size: 11px; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 190px; }
.intervento-actions { display: flex; gap: 5px; }
.icon-btn { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; width: 28px; height: 28px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.icon-btn:hover { background: #e2e8f0; }
.delete-btn { background: #1e293b; color: white; }
</style>