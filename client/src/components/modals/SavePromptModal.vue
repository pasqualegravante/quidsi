<template>
  <div class="dss-modal-overlay">
    <div class="dss-modal">
      <h3>
        {{ 
          dssStore.pendingAction?.type === 'select' ? 'SALVARE PRIMA DI CAMBIARE SCENARIO' : 
          dssStore.pendingAction?.type === 'create' ? 'SALVARE PRIMA DI CREARE' : 
          'SALVARE PRIMA DI DUPLICARE SCENARIO' 
        }}
      </h3>
      
      <p v-if="dssStore.pendingAction?.type === 'select'">
        Salva eventuali modifiche di "{{ dssStore.activeScenario?.label || 'questo scenario' }}" prima di lavorare su un altro scenario, oppure scarta le modifiche.
      </p>
      <p v-else-if="dssStore.pendingAction?.type === 'create'">
        Salva eventuali modifiche di "{{ dssStore.activeScenario?.label || 'questo scenario' }}" prima di creare una nuova pratica, oppure andranno perse.
      </p>
      <p v-else>
        Salva eventuali modifiche di "{{ dssStore.activeScenario?.label || 'questo scenario' }}" prima di duplicare, oppure una vecchia versione verrà duplicata.
      </p>

      <div class="modal-footer">
        <button class="btn-annulla" @click="dssStore.resolvePendingAction(false)">
          {{ dssStore.pendingAction?.type === 'duplicate' ? 'IGNORA' : 'SCARTA' }}
        </button>
        <button class="btn-salva" @click="dssStore.resolvePendingAction(true)">
          SALVA
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { useDssStore } from '../../store/dssStore';

export default {
  name: 'SavePromptModal',
  setup() {
    const dssStore = useDssStore();
    return { dssStore };
  }
}
</script>

<style scoped>
.dss-modal-overlay { 
  position: fixed; 
  top: 0; 
  left: 0; 
  width: 100vw; 
  height: 100vh; 
  background: rgba(15,23,42,0.85); 
  display: flex; 
  justify-content: center; 
  align-items: center; 
  z-index: 9999; 
}

.dss-modal { 
  background: #0f172a; 
  color: white; 
  padding: 30px; 
  border-radius: 12px; 
  width: 400px; 
  text-align: center; 
  border: 1px solid #334155; 
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); 
}

.dss-modal h3 { 
  margin-top: 0; 
  font-size: 16px; 
  border-bottom: 1px solid #334155; 
  padding-bottom: 15px; 
  letter-spacing: 1px; 
}

.modal-footer { 
  margin-top: 30px; 
  display: flex; 
  justify-content: center; 
  gap: 20px; 
}

.btn-annulla { background: transparent; color: white; border: 1px solid #cbd5e1; padding: 10px 25px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-salva { background: #2563eb; color: white; border: none; padding: 10px 25px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s; }

.btn-annulla:hover { background: rgba(255,255,255,0.1); }
.btn-salva:hover { background: #1d4ed8; }
</style>