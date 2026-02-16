<template>
  <transition name="fade">
    <div v-if="isOpen" class="fs-overlay">
      <button class="close-fs" @click="$emit('close')">CHIUDI ×</button>
      
      <div v-if="!isAuthenticated" class="fs-content login-box">
        <div class="pa-logo">🇮🇹</div>
        <h2>ACCESSO OPERATORI PA</h2>
        <p>L'accesso al Decision Support System del Comune di Trento è consentito esclusivamente tramite Identità Digitale SPID.</p>
        
        <div class="spid-container">
          <button class="btn-spid" @click="showSpidMenu = !showSpidMenu" :disabled="spidLoading">
            <span class="spid-icon">spid</span>
            {{ spidLoading ? 'Autenticazione in corso...' : 'Entra con SPID' }}
          </button>
          
          <transition name="slide-down">
            <ul v-if="showSpidMenu && !spidLoading" class="spid-providers">
              <li v-for="provider in providers" :key="provider" @click="handleSpidAuth(provider)">
                {{ provider }}
              </li>
              <li class="spid-info"><a href="#" @click.prevent>Maggiori informazioni su SPID</a></li>
            </ul>
          </transition>
        </div>
        
        <div v-if="spidLoading" class="spid-loading-msg">
          Reindirizzamento all'Identity Provider...<br>Verifica firma SAML in corso.
        </div>
      </div>

      <div v-else-if="currentView === 'dashboard'" class="fs-content dashboard-box">
        <header class="fs-header">
          <h1>PANNELLO GESTIONALE QUIDSI</h1>
          <p>Comune di Trento - Operatore: <strong class="user-badge">{{ currentUser }}</strong></p>
        </header>

        <div class="fs-grid">
          <div class="fs-card">
            <h3>Gestione Progetti</h3>
            <p>Archivio centralizzato degli scenari di viabilità salvati nel database.</p>
            <button class="fs-btn btn-highlight-blue" @click="currentView = 'scenarios'">📁 APRI ARCHIVIO</button>
          </div>
          <div class="fs-card">
            <h3>Hub Esportazione</h3>
            <p>Genera report PDF analitici o esporta la rete in formato GIS (GeoJSON).</p>
            <button class="fs-btn btn-highlight-purple" @click="currentView = 'export'">📥 ESPORTA DATI</button>
          </div>
          <div class="fs-card">
            <h3>Parametri Algoritmo</h3>
            <p>Taratura dei pesi e delle penalità per il calcolo dei cammini minimi.</p>
            <button class="fs-btn btn-highlight" @click="currentView = 'settings'">⚙️ IMPOSTA PESI</button>
          </div>
        </div>
        
        <div class="logout-wrapper">
          <button class="btn-logout" @click="handleLogout">🚪 ESCI DAL SISTEMA</button>
        </div>
      </div>

      <div v-else-if="currentView === 'export'" class="fs-content export-box">
        <header class="fs-header-small">
          <button class="btn-back" @click="currentView = 'dashboard'">← Torna alla Dashboard</button>
          <h2>HUB ESPORTAZIONE E REPORTISTICA</h2>
          <p>Genera documenti ufficiali basati sullo scenario attualmente visualizzato in mappa.</p>
        </header>

        <div class="export-grid">
          <div class="export-item" :class="{ 'exporting': exportStatus === 'pdf' }">
            <div class="export-icon">📄</div>
            <div class="export-details">
              <h4>Rapporto di Impatto Viabilistico</h4>
              <p>Documento PDF con statistiche, strade chiuse e variazioni dei tempi medi.</p>
            </div>
            <button class="btn-gen" @click="startExport('pdf')" :disabled="exportStatus">
              {{ exportStatus === 'pdf' ? 'Generazione...' : 'Genera PDF' }}
            </button>
          </div>

          <div class="export-item" :class="{ 'exporting': exportStatus === 'gis' }">
            <div class="export-icon">🗺️</div>
            <div class="export-details">
              <h4>Layer Cartografico (GeoJSON)</h4>
              <p>Esporta la topologia degli archi interrotti per l'integrazione in QGIS/ArcGIS.</p>
            </div>
            <button class="btn-gen" @click="startExport('gis')" :disabled="exportStatus">
              {{ exportStatus === 'gis' ? 'Esportazione...' : 'Scarica GeoJSON' }}
            </button>
          </div>
        </div>

        <div v-if="exportStatus" class="progress-container">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progress + '%' }"></div>
          </div>
          <p class="progress-text">Compilazione asset in corso... {{ progress }}%</p>
        </div>
      </div>

      <div v-else-if="currentView === 'settings'" class="fs-content settings-box">
        <header class="fs-header-small">
          <button class="btn-back" @click="currentView = 'dashboard'">← Torna alla Dashboard</button>
          <h2>TUNING ALGORITMO DI ROUTING</h2>
          <p>Definisci l'impedenza degli archi basata sulla gerarchia stradale.</p>
        </header>

        <div class="settings-grid">
          <div class="setting-item">
            <div class="setting-header">
              <label>Protezione Aree Residenziali</label>
              <span class="val-badge">{{ weights.residentialPenalty }}x</span>
            </div>
            <input type="range" v-model="weights.residentialPenalty" min="1.0" max="3.0" step="0.1" class="slider">
          </div>

          <div class="setting-item">
            <div class="setting-header">
              <label>Penalità Sensi Unici</label>
              <span class="val-badge">{{ weights.oneWayPenalty }}x</span>
            </div>
            <input type="range" v-model="weights.oneWayPenalty" min="1.0" max="2.0" step="0.1" class="slider">
          </div>

          <div class="setting-item">
            <div class="setting-header">
              <label>Congestione Globale</label>
              <span class="val-badge">{{ getCongestionLabel(weights.congestionLevel) }}</span>
            </div>
            <select v-model="weights.congestionLevel" class="custom-select">
              <option value="1.0">Traffico Regolare (1.0x)</option>
              <option value="1.5">Ora di Punta (1.5x)</option>
              <option value="2.5">Traffico Critico (2.5x)</option>
            </select>
          </div>

          <div class="setting-item toggle-item">
            <div class="toggle-info">
              <label class="text-red">🚨 Deroga Mezzi di Soccorso</label>
              <p class="setting-desc">Permetti il contromano con costo elevato per emergenze.</p>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="weights.emergencyOverride">
              <span class="slider-toggle round"></span>
            </label>
          </div>
        </div>

        <div class="settings-footer">
          <button class="btn-save-settings" @click="saveWeights">💾 SALVA CONFIGURAZIONE</button>
        </div>
      </div>

      <div v-else-if="currentView === 'scenarios'" class="fs-content scenarios-box">
        <header class="fs-header-small">
          <button class="btn-back" @click="currentView = 'dashboard'">← Torna alla Dashboard</button>
          <h2>ARCHIVIO PROGETTI E SCENARI</h2>
          <p>Gestisci gli asset di pianificazione urbana salvati nel sistema.</p>
        </header>

        <div class="save-scenario-bar">
          <input type="text" v-model="newScenarioName" placeholder="Nome nuovo scenario..." />
          <button class="btn-save-new" @click="saveCurrentScenario" :disabled="!newScenarioName">
            💾 SALVA STATO ATTUALE
          </button>
        </div>

        <div class="scenarios-list">
          <div v-for="scenario in scenarios" :key="scenario.id" class="scenario-card">
            <div class="sc-info">
              <span class="sc-date">{{ formatDate(scenario.date) }}</span>
              <h4 class="sc-name">{{ scenario.name }}</h4>
              <div class="sc-meta">
                <span>📍 {{ scenario.closedCount }} interruzioni</span>
                <span>⚙️ Pesi: {{ scenario.weightsMode }}</span>
              </div>
            </div>
            <div class="sc-actions">
              <button class="btn-load" @click="loadScenario(scenario)">APPLICA</button>
              <button class="btn-delete-mini" @click="deleteScenario(scenario.id)">🗑️</button>
            </div>
          </div>
          <div v-if="scenarios.length === 0" class="empty-list">Nessun progetto trovato.</div>
        </div>
      </div>

    </div>
  </transition>
</template>

<script>
/**
 * @file FullscreenMenu.vue
 * @description Modulo Gestionale Avanzato per Pubblica Amministrazione.
 * Integra: Autenticazione SPID, Hub Esportazione, Tuning Algoritmi e Archivio Scenari.
 */
export default {
  name: 'FullscreenMenu',
  props: { isOpen: { type: Boolean, required: true } },
  emits: ['close', 'load-scenario', 'save-request'],
  data() {
    return {
      isAuthenticated: false,
      showSpidMenu: false,
      spidLoading: false,
      currentUser: '',
      providers: ['Poste ID', 'InfoCert ID', 'Aruba ID', 'Sielte ID', 'Namirial ID', 'Lepida ID'],
      
      currentView: 'dashboard',
      exportStatus: null, // 'pdf', 'gis' o null
      progress: 0,
      
      weights: { residentialPenalty: 1.5, oneWayPenalty: 1.2, congestionLevel: 1.0, emergencyOverride: false },
      newScenarioName: '',
      scenarios: [
        { id: 1, name: 'Piano Neve Comparto Nord', date: '2026-01-10T14:30:00', closedCount: 14, weightsMode: 'Invernale', closed_edges: ['1040', '1041'] },
        { id: 2, name: 'Cantiere bypass ferroviario', date: '2026-02-05T09:00:00', closedCount: 5, weightsMode: 'Standard', closed_edges: ['2050'] }
      ]
    }
  },
  watch: {
    isOpen(newVal) {
      if (newVal) { this.checkAuth(); this.loadWeights(); this.fetchScenarios(); } 
      else { setTimeout(() => { this.currentView = 'dashboard'; this.exportStatus = null; }, 300); }
    }
  },
  mounted() { this.checkAuth(); this.loadWeights(); },
  methods: {
    checkAuth() {
      const token = localStorage.getItem('quidsi_jwt');
      const user = localStorage.getItem('quidsi_user');
      if (token && user) { this.isAuthenticated = true; this.currentUser = user; } 
      else { this.isAuthenticated = false; this.showSpidMenu = false; }
    },
    handleSpidAuth(provider) {
      this.showSpidMenu = false; this.spidLoading = true;
      setTimeout(() => {
        localStorage.setItem('quidsi_jwt', 'mock_jwt_agid');
        localStorage.setItem('quidsi_user', 'Operatore Tecnico (C.F. RSSMRA80A01L378X)');
        this.currentUser = 'Operatore Tecnico (C.F. RSSMRA80A01L378X)';
        this.isAuthenticated = true; this.spidLoading = false;
      }, 1200);
    },
    handleLogout() {
      localStorage.removeItem('quidsi_jwt'); localStorage.removeItem('quidsi_user');
      this.isAuthenticated = false; this.currentView = 'dashboard';
    },

    /** HUB ESPORTAZIONE */
    startExport(type) {
      this.exportStatus = type;
      this.progress = 0;
      const interval = setInterval(() => {
        this.progress += 10;
        if (this.progress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            alert(`${type.toUpperCase()} generato con successo e inviato al browser per il download.`);
            this.exportStatus = null;
            this.progress = 0;
          }, 500);
        }
      }, 150);
    },

    /** GESTIONE PESI */
    loadWeights() {
      const saved = localStorage.getItem('quidsi_algorithm_weights');
      if (saved) { try { this.weights = JSON.parse(saved); } catch (e) { console.error(e); } }
    },
    saveWeights() {
      localStorage.setItem('quidsi_algorithm_weights', JSON.stringify(this.weights));
      this.currentView = 'dashboard';
    },
    getCongestionLabel(val) {
      if (val == 1.0) return "Regolare"; if (val == 1.5) return "Moderato"; return "Critico";
    },

    /** GESTIONE SCENARI */
    fetchScenarios() {
      const saved = localStorage.getItem('quidsi_local_scenarios');
      if (saved) this.scenarios = JSON.parse(saved);
    },
    saveCurrentScenario() {
      this.$emit('save-request', this.newScenarioName);
      this.newScenarioName = '';
    },
    loadScenario(scenario) {
      this.$emit('load-scenario', scenario);
      this.$emit('close');
    },
    deleteScenario(id) {
      if(confirm("Eliminare lo scenario selezionato?")) {
        this.scenarios = this.scenarios.filter(s => s.id !== id);
        localStorage.setItem('quidsi_local_scenarios', JSON.stringify(this.scenarios));
      }
    },
    formatDate(dateStr) {
      return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit'});
    },
    handleAction(actionType) { alert(`Modulo [${actionType.toUpperCase()}] protetto da SPID.`); }
  }
}
</script>

<style scoped>
/* OVERLAY & COMMON */
.fs-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.95); color: white; z-index: 3000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); }
.close-fs { position: absolute; top: 30px; right: 40px; background: none; border: 1px solid white; color: white; padding: 10px 20px; cursor: pointer; font-weight: bold; transition: 0.2s; }
.close-fs:hover { background: white; color: #0f172a; }
.fs-content { width: 80%; max-width: 1200px; text-align: center; }

/* LOGIN & DASHBOARD */
.login-box { max-width: 450px; background: rgba(255,255,255,0.05); padding: 50px 40px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); margin: 0 auto; }
.pa-logo { font-size: 3rem; margin-bottom: 10px; }
.btn-spid { background-color: #0066cc; color: white; border: none; border-radius: 4px; padding: 12px 24px; font-weight: bold; cursor: pointer; width: 100%; }
.fs-header h1 { font-size: 3rem; letter-spacing: 4px; font-weight: 900; }
.user-badge { background: rgba(59, 130, 246, 0.2); color: #60a5fa; padding: 4px 10px; border-radius: 4px; }
.fs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; }
.fs-card { background: rgba(255,255,255,0.05); padding: 40px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); text-align: left; transition: 0.3s; }
.fs-card:hover { transform: translateY(-5px); background: rgba(255,255,255,0.08); }
.fs-btn { margin-top: 20px; width: 100%; padding: 12px; background: #2563eb; color: white; border: none; font-weight: bold; border-radius: 6px; cursor: pointer; }
.btn-highlight { background: #10b981; }
.btn-highlight-blue { background: #3b82f6; border: 2px solid #60a5fa; }
.btn-highlight-purple { background: #8b5cf6; border: 2px solid #a78bfa; }

/* HUB ESPORTAZIONE */
.export-box { max-width: 900px; margin: 0 auto; text-align: left; }
.export-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px; }
.export-item { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 30px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; text-align: center; transition: 0.3s; }
.export-icon { font-size: 3rem; margin-bottom: 20px; }
.export-details h4 { color: #fff; margin-bottom: 10px; }
.export-details p { font-size: 0.85rem; color: #94a3b8; line-height: 1.5; margin-bottom: 25px; }
.btn-gen { width: 100%; padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; font-weight: 800; cursor: pointer; }
.btn-gen:disabled { opacity: 0.5; cursor: wait; }
.exporting { border-color: #3b82f6; background: rgba(59, 130, 246, 0.05); }

/* Barra Progresso */
.progress-container { margin-top: 40px; }
.progress-bar { width: 100%; height: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; overflow: hidden; }
.progress-fill { height: 100%; background: #10b981; transition: width 0.2s ease-out; }
.progress-text { text-align: center; font-size: 0.8rem; color: #10b981; margin-top: 10px; font-weight: 800; }

/* ARCHIVIO & SETTINGS */
.settings-box, .scenarios-box { max-width: 800px; margin: 0 auto; text-align: left; }
.fs-header-small { margin-bottom: 40px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 20px; }
.btn-back { background: transparent; border: none; color: #94a3b8; cursor: pointer; font-weight: 700; margin-bottom: 15px; }
.setting-item { background: rgba(0,0,0,0.2); padding: 20px; border-radius: 12px; margin-bottom: 15px; }
.slider { width: 100%; height: 8px; border-radius: 4px; background: #334155; outline: none; -webkit-appearance: none; }
.slider::-webkit-slider-thumb { width: 18px; height: 18px; border-radius: 50%; background: #3b82f6; -webkit-appearance: none; cursor: pointer; }
.custom-select { width: 100%; padding: 12px; background: #0f172a; color: white; border: 1px solid #334155; border-radius: 8px; font-weight: 600; outline: none; }

/* Scenarios List */
.save-scenario-bar { display: flex; gap: 10px; margin-bottom: 30px; background: rgba(255,255,255,0.05); padding: 15px; border-radius: 10px; }
.save-scenario-bar input { flex: 1; background: rgba(15, 23, 42, 0.8); border: 1px solid #334155; border-radius: 6px; padding: 10px 15px; color: white; outline: none; }
.btn-save-new { background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 800; cursor: pointer; }
.scenarios-list { display: flex; flex-direction: column; gap: 15px; max-height: 50vh; overflow-y: auto; }
.scenario-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; }

.btn-logout { background: transparent; color: #ef4444; border: 1px solid #ef4444; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin-top: 40px; }

/* TRANSITIONS */
.fade-enter-active, .fade-leave-active { transition: opacity 0.4s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-down-enter-active { transition: all 0.3s; }
.slide-down-enter-from { opacity: 0; transform: translateY(-10px); }
</style>