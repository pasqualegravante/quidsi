<template>
  <div class="navbar-actions">
    <button class="action-btn" @click="dssStore.createScenario" title="Crea nuovo scenario">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="12" y1="18" x2="12" y2="12"></line>
        <line x1="9" y1="15" x2="15" y2="15"></line>
      </svg>
      <span class="label">New</span>
    </button>
    
    <button class="action-btn" @click="$emit('stampa-report')" title="Stampa vista corrente o report">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 6 2 18 2 18 9"></polyline>
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
        <rect x="6" y="14" width="12" height="8"></rect>
      </svg>
      <span class="label">Stampa</span>
    </button>

    <button :class="['action-btn', { 'btn-alert': dssStore.isModified }]" @click="dssStore.saveCurrentScenario" title="Salva lo scenario attivo">
      <div class="icon-wrapper">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
          <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
        <span v-if="dssStore.isModified" class="alert-dot"></span>
      </div>
      <span class="label">Salva</span>
    </button>

    <button class="action-btn" @click="exportScenario" title="Esporta i dati dello scenario corrente">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      <span class="label">Export</span>
    </button>
    
    <div class="user-profile">
      <div class="avatar">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>
      <span class="username">Operator</span>
    </div>
  </div>
</template>

<script>
import { useDssStore } from '../../store/dssStore';

export default {
  name: 'NavbarActions',
  emits: ['stampa-report'],
  setup() {
    const dssStore = useDssStore();
    return { dssStore };
  },
  methods: {
    exportScenario() {
      const scenario = this.dssStore.activeScenario;
      if (!scenario) return;
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(scenario, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", (scenario.label || 'pratica') + ".json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    }
  }
}
</script>

<style scoped>
.navbar-actions { 
  display: flex; 
  align-items: center; 
  gap: 16px; /* Spazio leggermente aumentato per far respirare le icone */
  min-width: 400px; 
  justify-content: flex-end; 
  height: 100%;
}

.action-btn { 
  background: transparent; 
  border: none; 
  color: #f8fafc; /* Bianco morbido */
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  justify-content: center;
  gap: 4px;
  cursor: pointer; 
  padding: 6px 12px; 
  border-radius: 8px; 
  transition: all 0.2s ease-in-out; 
  opacity: 0.85; 
}

.action-btn:hover { 
  opacity: 1; 
  background: rgba(255, 255, 255, 0.1); /* Effetto hover sottile sul blu scuro */
}

.icon {
  width: 20px;
  height: 20px;
}

.label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.3px;
}

/* Stile per il bottone di salvataggio quando ci sono modifiche */
.icon-wrapper {
  position: relative;
  display: flex;
}

.btn-alert { 
  color: #facc15; /* Giallo indicatore per richiamare l'attenzione */
  opacity: 1; 
}

.alert-dot {
  position: absolute;
  top: -2px;
  right: -4px;
  width: 8px;
  height: 8px;
  background-color: #ef4444; /* Rosso vivo */
  border-radius: 50%;
  border: 2px solid #1e293b; /* Bordo del colore del background navbar */
}

/* Profilo Operatore */
.user-profile { 
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-left: 8px; 
  border-left: 1px solid rgba(255, 255, 255, 0.2); 
  padding-left: 20px; 
  gap: 4px;
  cursor: pointer;
}

.user-profile .avatar .icon {
  width: 24px;
  height: 24px;
  color: #f8fafc;
}

.username {
  font-size: 11px; 
  font-weight: 600; 
  color: #cbd5e1; 
}

.user-profile:hover .avatar .icon,
.user-profile:hover .username {
  color: #ffffff;
}
</style>