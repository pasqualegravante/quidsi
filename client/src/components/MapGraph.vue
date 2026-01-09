<template>
  <div class="map-container">
    <div id="map" ref="mapRef" @contextmenu.prevent></div>
    
    <div class="control-panel">
      <div class="panel-header">
        <h3>QuidSI Enterprise</h3>
        <span class="subtitle">Scenario Manager v2.1</span>
      </div>

      <div class="panel-body">
        
        <div v-if="routeStats" class="kpi-container">
          <div class="kpi-row main">
            <span class="label">Attuale</span>
            <div class="values">
               <strong>{{ formatTime(routeStats.real.time) }}</strong>
               <small>{{ formatDist(routeStats.real.dist) }}</small>
            </div>
          </div>

          <div v-if="hasImpact" class="kpi-row delta bad">
            <span class="label">⚠️ Impatto</span>
            <div class="values">
               <span>+ {{ formatTime(routeStats.delta.time) }}</span>
               <small>+ {{ formatDist(routeStats.delta.dist) }}</small>
            </div>
          </div>
          
          <div v-else class="kpi-row delta good">
            <span class="label">✅ Ottimale</span>
            <div class="values">OK</div>
          </div>
        </div>

        <div v-if="closedCount > 0" class="warning-box">
          🚧 <strong>{{ closedCount }}</strong> vie chiuse attive.
        </div>
        <div v-else class="info-box">
          Tasto Destro su una strada per chiuderla.
        </div>

        <div class="actions">
          <button v-if="closedCount > 0" @click="resetAllClosures" class="btn btn-outline-danger">Reset Mappa</button>
        </div>

        <hr>

        <div class="scenario-manager">
          <h4>💾 Scenari Salvati</h4>
          
          <div v-if="closedCount > 0" class="save-form">
            <input 
              v-model="newScenarioName" 
              placeholder="Nome scenario (es. Mercato)" 
              class="input-text" 
              @keyup.enter="saveScenario"
            />
            <button @click="saveScenario" class="btn btn-primary" :disabled="isSaving">
              {{ saveBtnText }}
            </button>
          </div>

          <ul class="scenario-list">
            <li v-for="scen in scenarios" :key="scen._id" class="scenario-item">
              <div class="scen-info">
                <strong>{{ scen.name }}</strong>
                <small>{{ scen.closed_ids.length }} chiusure - {{ formatDate(scen.created_at) }}</small>
              </div>
              <div class="scen-actions">
                <button @click="loadScenario(scen._id)" class="btn-xs load" title="Carica Scenario">Carica</button>
                <button @click="deleteScenario(scen._id)" class="btn-xs del" title="Elimina">X</button>
              </div>
            </li>
            <li v-if="scenarios.length === 0" class="empty-msg">Nessuno scenario salvato nel DB.</li>
          </ul>
        </div>

      </div>
    </div>
  </div>
</template>

<script>
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- FIX ICONE LEAFLET ---
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

export default {
  name: 'MapGraph',
  data() {
    return {
      map: null,
      nodes: [],
      layers: { streets: null, route: null, markers: null },
      
      // Dati operativi
      routeStats: null, 
      closedCount: 0,
      currentClosedIds: [],
      
      // Dati Scenari (DB)
      scenarios: [],
      newScenarioName: "",
      
      // UI States
      isSaving: false,
      saveBtnText: "Salva"
    }
  },
  computed: {
    hasImpact() {
      return this.routeStats && this.routeStats.delta.time > 0;
    }
  },
  mounted() {
    this.initMap();
    this.loadMapData();
    this.fetchScenarios(); // Carica lista dal DB all'avvio
  },
  methods: {
    // --- 1. INIZIALIZZAZIONE MAPPA ---
    initMap() {
      this.map = L.map(this.$refs.mapRef, { zoomControl: true }).setView([46.0665, 11.1216], 15);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19
      }).addTo(this.map);

      this.layers.streets = L.layerGroup().addTo(this.map);
      this.layers.route = L.layerGroup().addTo(this.map);
      this.layers.markers = L.layerGroup().addTo(this.map);

      this.map.on('click', this.onMapClick);
    },

    // --- 2. CARICAMENTO DATI GEOJSON ---
    async loadMapData() {
      try {
        const res = await fetch('/grafo_optimized.geojson');
        if (!res.ok) throw new Error("GeoJSON non trovato in public/");
        
        const data = await res.json();
        
        L.geoJSON(data, {
          style: (f) => this.getStreetStyle(f),
          onEachFeature: (f, layer) => {
            const rawId = f.properties.desvia || f.properties.name || f.properties.id || "unknown";
            const id = String(rawId).trim();
            
            // FIX TOOLTIP: Non sticky, appare solo on hover
            layer.bindTooltip(`<b>${id}</b>`, { 
                permanent: false, 
                direction: 'top',
                className: 'street-label'
            });
            
            layer.on('contextmenu', (e) => {
              L.DomEvent.stopPropagation(e);
              this.toggleStreet(id);
            });
          }
        }).addTo(this.layers.streets);
      } catch (err) {
        console.error("Errore GeoJSON:", err);
      }
    },

    getStreetStyle(f) {
      const rawId = f.properties.desvia || f.properties.name || f.properties.id || "unknown";
      const id = String(rawId).trim();
      const isClosed = this.currentClosedIds.includes(id);
      
      return { 
        color: isClosed ? '#e74c3c' : '#3388ff', 
        weight: isClosed ? 5 : 4, 
        opacity: isClosed ? 0.8 : 0.4, 
        dashArray: isClosed ? '5, 10' : null 
      };
    },

    // --- 3. GESTIONE CLICK E PERCORSO ---
    async onMapClick(e) {
      if (this.nodes.length >= 2) this.resetMarkers();
      
      this.nodes.push(e.latlng);
      
      const color = this.nodes.length === 1 ? '#2980b9' : '#c0392b';
      L.circleMarker(e.latlng, {
        radius: 8, fillColor: color, color: '#fff', weight: 2, fillOpacity: 1
      }).addTo(this.layers.markers);

      if (this.nodes.length === 2) this.getRoute();
    },

    async getRoute() {
      try {
        const res = await fetch('http://localhost:4000/api/calculate-route', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ 
            start: [this.nodes[0].lat, this.nodes[0].lng], 
            end: [this.nodes[1].lat, this.nodes[1].lng] 
          })
        });
        
        const data = await res.json();
        if (data.path) {
            this.drawRoute(data.path);
            this.routeStats = data.stats; 
        }
      } catch (e) { 
        alert("Errore nel calcolo del percorso."); 
      }
    },

    drawRoute(path) {
      this.layers.route.clearLayers();
      const poly = L.polyline(path, {
        color: '#27ae60', weight: 7, opacity: 0.9, interactive: false
      }).addTo(this.layers.route);
      
      setTimeout(() => {
        if (this.map) this.map.fitBounds(poly.getBounds(), {padding: [50, 50]});
      }, 100);
    },

    // --- 4. GESTIONE CHIUSURE (API) ---
    async toggleStreet(id) {
      try {
        const res = await fetch(`http://localhost:4000/api/toggle-closure/${encodeURIComponent(id)}`, { method: 'POST' });
        const data = await res.json();
        
        this.closedCount = data.closed_count;
        this.currentClosedIds = data.currently_closed;
        
        this.refreshMapStyles();
        if (this.nodes.length === 2) this.getRoute();
        
      } catch (e) { console.error(e); }
    },

    async resetAllClosures() {
      await fetch('http://localhost:4000/api/reset-closures', {method: 'POST'});
      this.closedCount = 0;
      this.currentClosedIds = [];
      this.refreshMapStyles();
      if (this.nodes.length === 2) this.getRoute();
    },

    refreshMapStyles() {
      this.layers.streets.eachLayer(layer => {
        if (layer.feature) layer.setStyle(this.getStreetStyle(layer.feature));
      });
    },

    resetMarkers() {
      this.layers.markers.clearLayers();
      this.layers.route.clearLayers();
      this.nodes = [];
      this.routeStats = null;
    },

    // --- 5. GESTIONE SCENARI (DATABASE) ---
    async fetchScenarios() {
      try {
        const res = await fetch('http://localhost:4000/api/scenarios');
        if(res.ok) this.scenarios = await res.json();
      } catch (e) { console.error("Errore fetch scenari", e); }
    },

    async saveScenario() {
      if (!this.newScenarioName) return alert("Inserisci un nome!");
      
      // Controllo duplicati lato client per UX
      if (this.scenarios.some(s => s.name === this.newScenarioName)) {
          if(!confirm("Esiste già uno scenario con questo nome. Continuare?")) return;
      }

      this.isSaving = true;
      this.saveBtnText = "Salvando...";

      try {
        await fetch('http://localhost:4000/api/scenarios', {
            method: 'POST', 
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                name: this.newScenarioName, 
                closed_ids: this.currentClosedIds 
            })
        });
        
        // Successo
        this.newScenarioName = ""; // FIX: Pulisci input
        await this.fetchScenarios(); // Ricarica lista
        
        this.saveBtnText = "✅ Salvato!";
        setTimeout(() => {
            this.saveBtnText = "Salva";
            this.isSaving = false;
        }, 2000);

      } catch (e) { 
        alert("Errore salvataggio"); 
        this.isSaving = false;
        this.saveBtnText = "Salva";
      }
    },

    async loadScenario(id) {
        const btn = document.activeElement;
        const originalText = btn.innerText;
        btn.innerText = "⏳";
        
        try {
            await fetch(`http://localhost:4000/api/scenarios/${id}/apply`, { method: 'POST' });
            
            // Aggiorna stato locale
            const scenario = this.scenarios.find(s => s._id === id);
            if(scenario) {
                this.currentClosedIds = scenario.closed_ids;
                this.closedCount = scenario.closed_ids.length;
                this.refreshMapStyles();
                if (this.nodes.length === 2) this.getRoute();
            }
        } catch(e) { alert("Errore caricamento"); }
        
        btn.innerText = originalText;
    },

    async deleteScenario(id) {
        if(!confirm("Eliminare definitivamente questo scenario?")) return;
        await fetch(`http://localhost:4000/api/scenarios/${id}`, { method: 'DELETE' });
        this.fetchScenarios();
    },

    // --- 6. UTILITY E FORMATTAZIONE ---
    formatTime(val) { return val ? `${Math.ceil(val)} min` : "0 min"; },
    formatDist(val) { return val > 1000 ? `${(val/1000).toFixed(2)} km` : `${Math.round(val || 0)} m`; },
    formatDate(dateStr) {
        if(!dateStr) return "";
        const d = new Date(dateStr);
        return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
    }
  }
}
</script>

<style scoped>
/* Contenitore Mappa */
.map-container { 
  position: relative; 
  width: 100%; 
  height: 100vh; 
  font-family: 'Segoe UI', sans-serif;
}

#map { width: 100%; height: 100%; z-index: 0; background: #e0e0e0; }

/* Pannello Laterale */
.control-panel { 
  position: absolute; 
  top: 10px; 
  right: 10px; 
  width: 320px; 
  background: white; 
  z-index: 1000; 
  border-radius: 8px; 
  padding: 15px; 
  box-shadow: 0 4px 15px rgba(0,0,0,0.2); 
  max-height: 90vh; 
  overflow-y: auto; 
}

.panel-header h3 { margin: 0; color: #2c3e50; font-size: 20px; }
.subtitle { font-size: 11px; color: #7f8c8d; text-transform: uppercase; letter-spacing: 1px; }

/* KPI */
.kpi-container { margin: 15px 0; border: 1px solid #ddd; border-radius: 6px; overflow: hidden; }
.kpi-row { display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #eee; }
.kpi-row:last-child { border-bottom: none; }
.kpi-row.main { background: #f8f9fa; }
.kpi-row.delta.bad { background: #fee2e2; color: #b91c1c; }
.kpi-row.delta.good { background: #dcfce7; color: #15803d; }
.label { font-size: 10px; text-transform: uppercase; font-weight: bold; }
.values { text-align: right; display: flex; flex-direction: column; }
.values strong { font-size: 16px; }

/* Box Info */
.warning-box { background: #fff3cd; color: #856404; padding: 10px; border-radius: 4px; margin-bottom: 10px; font-size: 13px; border: 1px solid #ffeeba;}
.info-box { color: #666; font-size: 12px; margin-bottom: 10px; font-style: italic; text-align: center; }

/* Bottoni Generici */
.btn { padding: 8px; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; width: 100%; font-weight: 600; transition: all 0.2s;}
.btn-outline-danger { color: #e74c3c; border-color: #e74c3c; background: white; }
.btn-outline-danger:hover { background: #e74c3c; color: white; }
.btn-primary { background: #2c3e50; color: white; border: none; }
.btn-primary:hover { background: #34495e; }
.btn-primary:disabled { background: #95a5a6; cursor: not-allowed; }

/* Scenario Manager */
.scenario-manager { margin-top: 15px; }
.scenario-manager h4 { font-size: 14px; margin-bottom: 10px; color: #34495e; border-bottom: 1px solid #eee; padding-bottom: 5px; }
.save-form { display: flex; gap: 5px; margin-bottom: 10px; }
.input-text { flex: 1; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; outline: none; }
.input-text:focus { border-color: #2c3e50; }

.scenario-list { list-style: none; padding: 0; margin: 0; }
.scenario-item { background: #f9f9f9; border: 1px solid #eee; border-radius: 4px; padding: 8px; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center; }
.scen-info { display: flex; flex-direction: column; }
.scen-info strong { font-size: 13px; color: #2c3e50; }
.scen-info small { font-size: 10px; color: #7f8c8d; }
.scen-actions { display: flex; gap: 5px; }
.btn-xs { padding: 4px 8px; font-size: 11px; border-radius: 3px; cursor: pointer; border: none; font-weight: bold; }
.btn-xs.load { background: #27ae60; color: white; }
.btn-xs.del { background: #e74c3c; color: white; }
.btn-xs:hover { opacity: 0.8; }
.empty-msg { font-size: 12px; color: #999; text-align: center; margin-top: 10px; }
</style>