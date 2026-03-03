<template>
  <div class="sidebar-left-wrapper">
    <div class="vertical-tabs">
      <button :class="['tab-btn', { active: activeTab === 'funzioni' }]" @click="activeTab = 'funzioni'">Applica funzione</button>
      <button :class="['tab-btn', { active: activeTab === 'interventi' }]" @click="activeTab = 'interventi'">Interventi Attivi</button>
      <button :class="['tab-btn', { active: activeTab === 'archivio' }]" @click="activeTab = 'archivio'">Archivio Scenari</button>
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
            <div 
              class="input-with-icon clickable-input" 
              :class="{ 'active-selection': dssStore.selectionMode === 'start' }"
              @click="dssStore.setSelectionMode('start')"
            >
              <span class="location-icon">📍</span>
              <div :class="['fake-input', { 'filled': dssStore.routingStartPoint }]">
                {{ dssStore.routingStartPoint ? dssStore.routingStartPoint.street : 'Clicca per Partenza (A)' }}
              </div>
            </div>

            <div 
              class="input-with-icon clickable-input" 
              :class="{ 'active-selection': dssStore.selectionMode === 'end' }"
              @click="dssStore.setSelectionMode('end')"
            >
              <span class="location-icon">📍</span>
              <div :class="['fake-input', { 'filled': dssStore.routingEndPoint }]">
                {{ dssStore.routingEndPoint ? dssStore.routingEndPoint.street : 'Clicca per Destinazione (B)' }}
              </div>
            </div>

            <button class="btn-calcola" @click="eseguiCalcolo" :disabled="!dssStore.routingStartPoint || !dssStore.routingEndPoint">
              Calcola Percorso
            </button>
          </div>

          <div v-if="selectedFunction === 'connessione'" class="function-layout">
            <p class="connessione-text">quali zone della città vengono isolate da questo scenario?</p>
            <button class="btn-calcola" @click="eseguiCalcolo">Visualizza Aree</button>
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

      <div v-if="activeTab === 'archivio'" class="tab-pane">
         <div class="pane-header">
          <h3>Archivio Scenari</h3>
          <button class="collapse-btn">⮜</button>
        </div>
        
        <div class="pane-body">
          <div class="search-scenario-bar">
            <input type="text" v-model="filterScenario" placeholder="BARRA DI RICERCA SCENARIO" class="scenario-search-input" />
            <button class="btn-new-inline" @click="dssStore.createScenario">Nuovo scenario</button>
          </div>

          <ul class="scenario-list">
            <li v-for="scen in filteredScenarios" :key="scen.id" class="scenario-row">
              <div class="scenario-main-info">
                <span class="scen-label">
                  {{ scen.label }} 
                  <strong v-if="scen.id === dssStore.activeScenario?.id && dssStore.isModified" class="mod-tag">
                    [MODIFICATO]
                  </strong>
                </span>
                <p class="scen-desc">{{ scen.description || 'Nessuna descrizione.' }}</p>
              </div>
              
              <div class="scenario-actions">
                <button @click="dssStore.selectScenario(scen.id)" title="Seleziona">📂</button>
                <button @click="dssStore.duplicateScenario(scen.id)" title="Duplica">📋</button>
                <button @click="openDeleteModal(scen)" title="Elimina">🗑️</button>
              </div>
            </li>
          </ul>
        </div>
      </div>

    </div>

    <div v-if="showDeleteModal" class="dss-modal-overlay">
      <div class="dss-modal">
        <h3>CONFERMA ELIMINAZIONE</h3>
        <p>Vuoi davvero eliminare "{{ scenarioToDelete?.label }}"?</p>
        <div class="modal-footer">
          <button class="btn-annulla" @click="showDeleteModal = false">ANNULLA</button>
          <button class="btn-elimina" @click="executeDelete">ELIMINA</button>
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
    onMounted(() => { dssStore.fetchAllScenarios(); });
    return { dssStore };
  },
  data() {
    return {
      activeTab: 'funzioni',
      selectedFunction: 'dijkstra',
      filterScenario: '',
      showDeleteModal: false,
      scenarioToDelete: null
    };
  },
  computed: {
    filteredScenarios() {
      if (!this.filterScenario) return this.dssStore.scenarios;
      return this.dssStore.scenarios.filter(s => 
        s.label.toLowerCase().includes(this.filterScenario.toLowerCase())
      );
    }
  },
  methods: {
    eseguiCalcolo() {
      if (this.selectedFunction === 'dijkstra') {
        this.dssStore.calculateDijkstra(this.dssStore.routingStartPoint.id, this.dssStore.routingEndPoint.id);
      } else if (this.selectedFunction === 'connessione') {
        this.dssStore.calculateConnessione();
      }
    },
    openDeleteModal(scen) {
      this.scenarioToDelete = scen;
      this.showDeleteModal = true;
    },
    async executeDelete() {
      if (this.scenarioToDelete) {
        await this.dssStore.deleteScenario(this.scenarioToDelete.id);
        this.showDeleteModal = false;
        this.scenarioToDelete = null;
      }
    }
  }
}
</script>

<style scoped>
.sidebar-left-wrapper { display: flex; height: 100%; background: #f8fafc; border-right: 1px solid #cbd5e1; z-index: 1000; position: relative; }
.vertical-tabs { display: flex; flex-direction: column; width: 45px; background: #e2e8f0; border-right: 1px solid #cbd5e1; }
.tab-btn { writing-mode: vertical-rl; transform: rotate(180deg); padding: 20px 10px; cursor: pointer; border: none; background: transparent; font-weight: bold; color: #475569; border-left: 3px solid transparent; transition: 0.2s; letter-spacing: 1px; }
.tab-btn:hover { background: rgba(255,255,255,0.5); }
.tab-btn.active { background: white; border-left-color: #2563eb; color: #0f172a; }

.tab-content-area { width: 320px; background: white; display: flex; flex-direction: column; }
.pane-header { display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #f1f5f9; border-bottom: 1px solid #cbd5e1; }
.pane-header h3 { margin: 0; font-size: 14px; color: #0f172a; }
.collapse-btn { background: #e2e8f0; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px; font-weight: bold; }
.pane-body { padding: 20px; flex: 1; overflow-y: auto; }

.dropdown-group { border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; margin-bottom: 25px; }
.dropdown-group label { display: block; font-size: 10px; color: #64748b; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px;}
.custom-select { width: 100%; border: none; outline: none; background: transparent; font-weight: bold; color: #0f172a; cursor: pointer; font-size: 14px;}

.input-with-icon { display: flex; align-items: center; border: 1px solid #94a3b8; border-radius: 20px; padding: 8px 15px; margin-bottom: 15px; background: white; transition: 0.2s;}
.clickable-input { cursor: pointer; user-select: none; border-color: #cbd5e1; }
.clickable-input:hover { border-color: #64748b; background: #f8fafc; }
.active-selection { border-color: #f59e0b !important; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2); background: #fffbeb !important; }
.fake-input { margin-left: 10px; width: 100%; font-size: 13px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: 'Inter', sans-serif;}
.fake-input.filled { color: #0f172a; font-weight: bold; }

.location-icon { font-size: 16px; }
.btn-calcola { width: 100%; background: #e2e8f0; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; font-weight: bold; color: #1e293b; cursor: pointer; margin-top: 10px; transition: 0.2s; }
.btn-calcola:hover { background: #cbd5e1; }
.btn-calcola:disabled { opacity: 0.5; cursor: not-allowed; }
.connessione-text { text-align: center; font-size: 13px; color: #334155; line-height: 1.5; margin: 30px 0; }

.interventi-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.intervento-item { display: flex; align-items: center; justify-content: space-between; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 4px; background: white; }
.intervento-info { font-size: 11px; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 190px; }
.intervento-actions { display: flex; gap: 5px; }
.icon-btn { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; width: 28px; height: 28px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s;}
.icon-btn:hover { background: #e2e8f0; }
.delete-btn { background: #1e293b; color: white; border-color: #1e293b;}
.delete-btn:hover { background: #0f172a; }
.empty-state { font-size: 12px; color: #64748b; text-align: center; margin-top: 20px; }

.search-scenario-bar { margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px; }
.scenario-search-input { width: 100%; padding: 12px 15px; border-radius: 20px; border: 1px solid #cbd5e1; box-sizing: border-box; font-family: 'Inter', sans-serif; font-size: 12px; outline: none; }
.scenario-search-input:focus { border-color: #2563eb; }
.btn-new-inline { background: #1e293b; color: white; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.btn-new-inline:hover { background: #0f172a; }

.scenario-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px;}
.scenario-row { border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; background: #f8fafc; }
.scenario-main-info { margin-bottom: 12px; }
.scen-label { font-weight: 800; font-size: 14px; color: #0f172a; display: block; }
.scen-desc { font-size: 12px; color: #64748b; margin: 5px 0 0 0; }
.mod-tag { color: #ef4444; font-size: 11px; margin-left: 5px; border: 1px solid #ef4444; padding: 2px 4px; border-radius: 4px; }
.scenario-actions { display: flex; justify-content: flex-end; gap: 8px; }
.scenario-actions button { background: white; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer; font-size: 16px; padding: 6px 10px; transition: 0.2s;}
.scenario-actions button:hover { background: #e2e8f0; transform: translateY(-1px); }

.dss-modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15,23,42,0.85); display: flex; justify-content: center; align-items: center; z-index: 5000; }
.dss-modal { background: #0f172a; color: white; padding: 30px; border-radius: 12px; width: 400px; text-align: center; border: 1px solid #334155; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
.dss-modal h3 { margin-top: 0; font-size: 16px; border-bottom: 1px solid #334155; padding-bottom: 15px; letter-spacing: 1px; }
.modal-footer { margin-top: 30px; display: flex; justify-content: center; gap: 20px; }
.btn-annulla { background: transparent; color: white; border: 1px solid #cbd5e1; padding: 10px 25px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-elimina { background: #ef4444; color: white; border: none; padding: 10px 25px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-annulla:hover { background: rgba(255,255,255,0.1); }
.btn-elimina:hover { background: #dc2626; }
</style>