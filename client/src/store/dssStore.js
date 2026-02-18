import { defineStore } from 'pinia';
import { ApiService } from '../services/api';
import { StorageService } from '../services/storage';
import { uiStore } from './uiStore';

export const useDssStore = defineStore('dss', {
  state: () => ({
    roadList: [], 
    
    // CONTIENE I CODICI REALI DEL DATABASE (es. "101").
    // Fondamentale per la compatibilità con il Backend e con il LocalStorage.
    activeClosureIds: [], 
    
    activeRoutePath: [],
    routing: { startPoint: null, endPoint: null, activeMode: null },
    mapCursor: 'grab',
    mapFocusId: null,
    currentAbortController: null,
    isSidebarOpen: false,
    selectedEdge: null,
    sidebarTimeout: null
  }),

  getters: {
    activeClosuresObjects(state) {
      // Usiamo un Set per non mostrare 5 volte la stessa via se è chiusa a pezzi
      const uniqueNames = new Map();

      state.activeClosureIds.forEach(id => {
        const road = state.roadList.find(r => String(r.id) === String(id));
        if (road) {
          // Usiamo il codice base (quello prima dell'underscore) per raggruppare visivamente
          const displayId = id.includes('_') ? id.split('_')[0] : id;
          const displayName = road.street || `Arco ${displayId}`;
          
          if (!uniqueNames.has(displayName)) {
            uniqueNames.set(displayName, { id: displayId, name: displayName });
          }
        }
      });

      return Array.from(uniqueNames.values());
    }
  },

  actions: {
    setRoadList(list) { this.roadList = list; },
    setFocusEdge(id) { this.mapFocusId = String(id); },
    
    // --- GESTIONE UI SIDEBAR ---
    openSidebar(edge) {
      if (this.sidebarTimeout) clearTimeout(this.sidebarTimeout);
      this.selectedEdge = edge;
      this.isSidebarOpen = true;
    },

    closeSidebar() {
      this.isSidebarOpen = false;
      if (this.sidebarTimeout) clearTimeout(this.sidebarTimeout);
      // Timeout per permettere all'animazione CSS di chiusura di finire fluidamente
      this.sidebarTimeout = setTimeout(() => { 
        this.selectedEdge = null; 
      }, 300);
    },

    toggleRoutingMode(mode) {
      this.routing.activeMode = this.routing.activeMode === mode ? null : mode;
      if (this.routing.activeMode) {
        this.closeSidebar();
        this.mapCursor = 'crosshair';
        uiStore.showToast('Seleziona un punto sulla mappa', 'warning');
      } else {
        this.mapCursor = 'grab';
      }
    },

    // --- LOGICA DI CHIUSURA (Basata rigorosamente sull'ID reale) ---
    toggleClosure(edge, entireStreet = false) {
      if (!edge || !edge.id) return;
      
      const targetId = String(edge.id);
      const isCurrentlyClosed = this.activeClosureIds.includes(targetId);

      let idsToProcess = [targetId];

      // Se l'utente clicca "Intera Via", chiudiamo in blocco tutti i codici con quello stesso nome
      if (entireStreet && edge.street) {
        idsToProcess = this.roadList
          .filter(r => r.street === edge.street)
          .map(r => String(r.id));
      }

      if (isCurrentlyClosed) {
        // RIAPRI
        this.activeClosureIds = this.activeClosureIds.filter(id => !idsToProcess.includes(id));
      } else {
        // CHIUDI (Set evita duplicati nell'array)
        const newClosures = new Set([...this.activeClosureIds, ...idsToProcess]);
        this.activeClosureIds = Array.from(newClosures);
      }

      // Salvataggio su disco e ricalcolo immediato
      StorageService.saveClosures(this.activeClosureIds);
      this.triggerAutoRecalc();

      // Sincronizza lo stato visivo (Rosso/Verde) del bottone nella Sidebar aperta
      if (this.selectedEdge && String(this.selectedEdge.id) === targetId) {
        this.selectedEdge.isClosed = this.activeClosureIds.includes(targetId);
      }
    },

    // --- RESET TOTALE ---
    softReset() {
      this.closeSidebar(); 
      if (this.currentAbortController) {
        this.currentAbortController.abort();
        this.currentAbortController = null;
      }

      this.routing = { startPoint: null, endPoint: null, activeMode: null };
      this.activeRoutePath = [];
      this.activeClosureIds = [];
      this.mapCursor = 'grab';
      this.mapFocusId = null;
      
      StorageService.clearClosures(); 
      uiStore.showToast('Sistema ripristinato', 'info');
    },

    // --- RICALCOLO PERCORSI (DIJKSTRA) ---
    triggerAutoRecalc() {
      if (this.activeRoutePath.length === 0) return;
      setTimeout(() => this.executeDijkstra(), 600);
    },

    async executeDijkstra() {
      if (!this.routing.startPoint || !this.routing.endPoint) return;
      
      if (this.currentAbortController) this.currentAbortController.abort();
      this.currentAbortController = new AbortController();
      
      uiStore.setCalculating(true);
      
      const payload = {
        start_id: this.routing.startPoint.id, 
        end_id: this.routing.endPoint.id,
        closed_edges: this.activeClosureIds, // Invio diretto degli ID puri a Python
        weights: StorageService.getWeights() 
      };

      try {
        const data = await ApiService.calculateRoute(payload, this.currentAbortController.signal);
        
        if (data && data.success && data.path && data.path.length) {
          this.activeRoutePath = data.path; 
          uiStore.showToast('Percorso ottimale ricalcolato', 'success');
        } else {
          this.activeRoutePath = []; 
          uiStore.showToast('Nessun percorso disponibile', 'warning');
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          this.activeRoutePath = []; 
          uiStore.showToast('Errore di calcolo', 'error');
        }
      } finally {
        uiStore.setCalculating(false); 
        this.currentAbortController = null;
      }
    }
  }
});