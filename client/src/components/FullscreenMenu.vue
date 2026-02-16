<template>
  <transition name="fade">
    <div v-if="isOpen" class="fs-overlay">
      <button class="close-fs" @click="$emit('close')">CHIUDI ×</button>
      
      <div v-if="!isAuthenticated" class="fs-content login-box">
        <div class="pa-logo">🇮🇹</div>
        <h2>ACCESSO OPERATORI PA</h2>
        <p>L'accesso al Decision Support System del Comune di Trento è consentito esclusivamente tramite Identità Digitale.</p>
        
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
              <li class="spid-info">
                <a href="#" @click.prevent>Maggiori informazioni su SPID</a>
              </li>
            </ul>
          </transition>
        </div>
        
        <div v-if="spidLoading" class="spid-loading-msg">
          Reindirizzamento all'Identity Provider in corso.<br>Attendere la risposta SAML...
        </div>
      </div>

      <div v-else class="fs-content dashboard-box">
        <header class="fs-header">
          <h1>PANNELLO GESTIONALE QUIDSI</h1>
          <p>Comune di Trento - Operatore autenticato: <strong class="user-badge">{{ currentUser }}</strong></p>
        </header>

        <div class="fs-grid">
          <div class="fs-card">
            <h3>Gestione Progetti</h3>
            <p>Carica o salva scenari di viabilità predefiniti per analisi comparative.</p>
            <button class="fs-btn" @click="handleAction('scenario')">NUOVO SCENARIO</button>
          </div>
          <div class="fs-card">
            <h3>Hub Esportazione</h3>
            <p>Genera report PDF dettagliati o esporta la rete in formato Shapefile.</p>
            <button class="fs-btn" @click="handleAction('export')">CONFIGURA REPORT</button>
          </div>
          <div class="fs-card">
            <h3>Parametri Algoritmo</h3>
            <p>Configura le impedenze per il calcolo dei cammini minimi su Node/Python.</p>
            <button class="fs-btn" @click="handleAction('weights')">IMPOSTA PESI</button>
          </div>
        </div>
        
        <div class="logout-wrapper">
          <button class="btn-logout" @click="handleLogout">🚪 ESCI DAL SISTEMA (Revoca Sessione)</button>
        </div>
      </div>

    </div>
  </transition>
</template>

<script>
/**
 * @file FullscreenMenu.vue
 * @description Modulo di Autenticazione e Gestione. Implementa una simulazione 
 * dell'interfaccia SPID (AgID) per il login degli operatori della PA.
 */
export default {
  name: 'FullscreenMenu',
  props: { isOpen: { type: Boolean, required: true } },
  emits: ['close'],
  data() {
    return {
      isAuthenticated: false,
      showSpidMenu: false,
      spidLoading: false,
      currentUser: '',
      // Elenco fittizio degli Identity Provider accreditati AgID
      providers: ['Poste ID', 'InfoCert ID', 'Aruba ID', 'Sielte ID', 'Namirial ID', 'Lepida ID']
    }
  },
  watch: {
    isOpen(newVal) {
      if (newVal) this.checkAuth();
    }
  },
  mounted() {
    this.checkAuth();
  },
  methods: {
    checkAuth() {
      const token = localStorage.getItem('quidsi_jwt');
      const user = localStorage.getItem('quidsi_user');
      if (token && user) {
        this.isAuthenticated = true;
        this.currentUser = user;
      } else {
        this.isAuthenticated = false;
        this.showSpidMenu = false;
      }
    },

    /**
     * Simula il flusso OAuth2/SAML dello SPID.
     * @param {String} provider - Il nome dell'Identity Provider scelto
     */
    handleSpidAuth(provider) {
      this.showSpidMenu = false;
      this.spidLoading = true;
      console.log(`[SPID Mock] Reindirizzamento verso ${provider}...`);

      // Simuliamo il tempo di rete e il ritorno dall'Identity Provider
      setTimeout(() => {
        // Generiamo un finto JWT e dei dati utente fittizi restituiti dallo SPID
        const fakeJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.spid_mock_token";
        const fakeUser = "Mario Rossi (C.F. RSSMRA80A01L378X)";
        
        localStorage.setItem('quidsi_jwt', fakeJwt);
        localStorage.setItem('quidsi_user', fakeUser);
        
        this.currentUser = fakeUser;
        this.isAuthenticated = true;
        this.spidLoading = false;
        
        console.log(`[SPID Mock] Autenticazione completata con successo tramite ${provider}.`);
      }, 1500); // 1.5 secondi di attesa per l'effetto drammatico
    },

    handleLogout() {
      localStorage.removeItem('quidsi_jwt');
      localStorage.removeItem('quidsi_user');
      this.isAuthenticated = false;
      this.currentUser = '';
    },

    handleAction(actionType) {
      alert(`Accesso autorizzato tramite SPID. Funzionalità [${actionType.toUpperCase()}] pronta per l'integrazione backend.`);
    }
  }
}
</script>

<style scoped>
.fs-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.95); color: white; z-index: 3000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); }
.close-fs { position: absolute; top: 30px; right: 40px; background: none; border: 1px solid white; color: white; padding: 10px 20px; cursor: pointer; font-weight: bold; transition: all 0.2s; letter-spacing: 1px;}
.close-fs:hover { background: white; color: #0f172a; }

.fs-content { width: 80%; max-width: 1200px; text-align: center; }

/* STILI LOGIN PA / SPID */
.login-box { max-width: 450px; background: rgba(255,255,255,0.05); padding: 50px 40px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 50px rgba(0,0,0,0.5); margin: 0 auto; }
.pa-logo { font-size: 3rem; margin-bottom: 10px; }
.login-box h2 { margin: 0 0 15px 0; font-weight: 900; letter-spacing: 2px; }
.login-box p { color: #94a3b8; font-size: 0.95rem; margin-bottom: 40px; line-height: 1.6; }

/* SPID Button Mockup */
.spid-container { position: relative; width: 100%; display: flex; flex-direction: column; align-items: center; }
.btn-spid { background-color: #0066cc; color: white; border: none; border-radius: 4px; padding: 12px 24px; font-size: 1.1rem; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 100%; transition: background-color 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.2); }
.btn-spid:hover:not(:disabled) { background-color: #004c99; }
.btn-spid:disabled { opacity: 0.7; cursor: wait; }
.spid-icon { font-family: 'Arial', sans-serif; font-weight: 900; font-style: italic; margin-right: 12px; font-size: 1.2rem; }

/* Dropdown Menu SPID */
.spid-providers { position: absolute; top: 100%; left: 0; width: 100%; background: white; list-style: none; padding: 0; margin: 5px 0 0 0; border-radius: 4px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); overflow: hidden; z-index: 10; text-align: left; }
.spid-providers li { padding: 12px 20px; color: #0f172a; font-weight: 600; cursor: pointer; border-bottom: 1px solid #e2e8f0; transition: background 0.2s; }
.spid-providers li:hover:not(.spid-info) { background: #f1f5f9; color: #0066cc; }
.spid-info { background: #f8fafc; font-size: 0.8rem; text-align: center; }
.spid-info a { color: #0066cc; text-decoration: none; }
.spid-info a:hover { text-decoration: underline; }

.spid-loading-msg { margin-top: 25px; color: #3b82f6; font-size: 0.85rem; font-weight: 600; line-height: 1.5; animation: pulse 1.5s infinite; }

/* STILI DASHBOARD AMMINISTRATIVA */
.fs-header { margin-bottom: 60px; }
.fs-header h1 { font-size: 3rem; letter-spacing: 4px; font-weight: 900; margin-bottom: 15px; }
.fs-header p { color: #94a3b8; font-size: 1.1rem; }
.user-badge { background: rgba(59, 130, 246, 0.2); color: #60a5fa; padding: 4px 10px; border-radius: 4px; letter-spacing: 0.5px; }

.fs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; }
.fs-card { background: rgba(255,255,255,0.05); padding: 40px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); transition: transform 0.3s ease; text-align: left; }
.fs-card:hover { transform: translateY(-5px); background: rgba(255,255,255,0.08); }
.fs-card h3 { color: #3b82f6; margin-top: 0; margin-bottom: 15px; font-size: 1.4rem; }
.fs-card p { font-size: 0.9rem; line-height: 1.6; color: #cbd5e1; min-height: 3rem; }
.fs-btn { margin-top: 20px; width: 100%; padding: 12px; background: #2563eb; color: white; border: none; font-weight: bold; cursor: pointer; border-radius: 6px; }
.fs-btn:hover { background: #1d4ed8; }

.logout-wrapper { margin-top: 50px; }
.btn-logout { background: transparent; color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.5); padding: 10px 20px; border-radius: 6px; font-weight: 700; cursor: pointer; transition: 0.2s; }
.btn-logout:hover { background: rgba(239, 68, 68, 0.1); border-color: #ef4444; }

/* Animazioni */
.fade-enter-active, .fade-leave-active { transition: opacity 0.4s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.3s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-10px); }
@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
</style>