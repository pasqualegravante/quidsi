<template>
  <div class="map-container" :class="{ 'waiting': isLoading }">
    <div id="map" ref="mapRef" @contextmenu.prevent></div>
    
    <div class="control-panel">
      <div class="panel-header">
        <h3>QuidSI Enterprise</h3>
        <span class="subtitle">Traffic & Scenario Manager v4.2</span>
        <span v-if="isLoading" class="loader">⏳</span>
      </div>

      <div v-if="errorMessage" class="error-banner">
        <strong>Errore:</strong> {{ errorMessage }}
        <button @click="errorMessage = ''" class="close-err">✖</button>
      </div>

      <div class="panel-body">
        
        <div class="mode-switcher">
          <button :class="['mode-btn', { active: !isIsochroneMode }]" @click="setMode(false)">Calcolo Percorso</button>
          <button :class="['mode-btn', { active: isIsochroneMode }]" @click="setMode(true)">Analisi Copertura</button>
        </div>

        <div class="traffic-box">
            <span class="lbl">Traffico:</span>
            <div class="traffic-btns">
                <button :class="{active: currentTraffic==='low'}" @click="setTraffic('low')" title="Scorrevole (1.0x)" class="tr-btn green">🟢</button>
                <button :class="{active: currentTraffic==='medium'}" @click="setTraffic('medium')" title="Rallentamenti (1.5x)" class="tr-btn yellow">🟡</button>
                <button :class="{active: currentTraffic==='high'}" @click="setTraffic('high')" title="Intenso (2.5x)" class="tr-btn red">🔴</button>
                <button :class="{active: currentTraffic==='jam'}" @click="setTraffic('jam')" title="Blocco (5.0x)" class="tr-btn black">⚫</button>
            </div>
        </div>

        <div v-if="isIsochroneMode" class="isochrone-controls">
          <label for="isoRange">Raggio: <strong>{{ isochroneMinutes }} min</strong></label>
          <input id="isoRange" type="range" v-model.number="isochroneMinutes" min="1" max="15" step="1" @input="updateIsochrone" class="slider" :disabled="isLoading" />
        </div>

        <div class="search-section">
          <div class="search-box">
            <input v-model="searchQuery" placeholder="Cerca indirizzo..." @keyup.enter="searchAddr" :disabled="isLoading" />
            <button @click="searchAddr" :disabled="isLoading">🔍</button>
          </div>
          <ul v-if="searchResults.length" class="results-list">
            <li v-for="r in searchResults" :key="r.place_id" @click="flyTo(r)">
              {{ r.display_name.split(',')[0] }}
            </li>
          </ul>
        </div>
        
        <hr />

        <div v-if="!isIsochroneMode && routeStats" class="kpi-box">
          <div class="kpi-row">
            <span>Stima Tempo:</span> 
            <div class="kpi-val">
               <strong>{{ fmtTime(routeStats.real.time) }}</strong>
               <small>{{ fmtDist(routeStats.real.dist) }}</small>
            </div>
          </div>
          <div v-if="currentTraffic !== 'low'" class="kpi-row bad">
             <span>Impatto Traffico:</span>
             <small>{{ trafficLabel }}</small>
          </div>
        </div>

        <div v-if="!isIsochroneMode && routeStats" class="instructions-box">
          <h4>Itinerario</h4>
          <ul v-if="routeInstructions.length > 0" class="step-list">
            <li v-for="(step, index) in routeInstructions" :key="index">
              <span class="step-icon">👉</span>
              <div class="step-info">
                <span class="step-name">{{ step.name || "Strada senza nome" }}</span>
                <span class="step-dist">{{ fmtDist(step.dist) }}</span>
              </div>
            </li>
            <li class="step-end">🏁 Arrivo a destinazione</li>
          </ul>
          <div v-else class="no-steps">⚠️ Nessuna istruzione dettagliata disponibile.</div>
        </div>

        <div class="closures-box">
          <div class="box-header">
             Chiusure Attive ({{ closedCount }}) 
             <button @click="resetAll" v-if="closedCount" class="btn-reset" :disabled="isLoading">Reset</button>
          </div>
          <ul v-if="currentClosedIds.length">
            <li v-for="id in currentClosedIds" :key="id">
              <span class="truncate">{{ id }}</span> 
              <button @click="toggleStreet(id)" class="btn-icon" :disabled="isLoading">Apri</button>
            </li>
          </ul>
        </div>

        <hr />

        <div class="scenario-box">
            <h4>Scenari Salvati</h4>
            <div class="save-row">
                <input v-model="newScenarioName" placeholder="Nome scenario..." :disabled="isLoading" />
                <button @click="saveScenario" :disabled="!newScenarioName || isLoading">💾</button>
            </div>
            <ul v-if="scenarios.length">
                <li v-for="s in scenarios" :key="s._id">
                    <div class="sc-info">
                        <strong>{{ s.name }}</strong>
                        <small>({{ s.closed_ids.length }} chiusure)</small>
                    </div>
                    <div class="sc-actions">
                        <button @click="applyScenario(s._id)" title="Applica" :disabled="isLoading">📂</button>
                        <button @click="deleteScenario(s._id)" title="Elimina" class="btn-del" :disabled="isLoading">🗑️</button>
                    </div>
                </li>
            </ul>
        </div>

      </div>
    </div>
  </div>
</template>

<script>
/**
 * MapGraph.vue - Componente Principale
 * Gestisce la mappa Leaflet, le chiamate API al backend Python,
 * la logica degli scenari e la visualizzazione del traffico.
 */
import { markRaw } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix icone Leaflet mancanti in build
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import icon from 'leaflet/dist/images/marker-icon.png';
import shadow from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: iconRetina, iconUrl: icon, shadowUrl: shadow });

const API_BASE_URL = 'http://localhost:4000/api';

export default {
  name: 'MapGraph',
  data() {
    return {
      // Mappa & Layers
      map: null,
      nodes: [],
      layers: { base: null, route: null, iso: null, pins: null },
      
      // Dati Routing
      routeStats: null,
      routeInstructions: [],
      
      // Gestione Chiusure
      closedCount: 0,
      currentClosedIds: [],
      
      // Scenari
      scenarios: [],
      newScenarioName: "",
      
      // UI State
      searchQuery: "",
      searchResults: [],
      isIsochroneMode: false,
      isochroneMinutes: 5,
      lastIsoCenter: null,
      isLoading: false,
      errorMessage: '',
      currentTraffic: 'low'
    }
  },
  computed: {
      trafficLabel() {
          const map = { low: "Nullo", medium: "+50% Tempo", high: "+150% Tempo", jam: "Blocco" };
          return map[this.currentTraffic] || "";
      }
  },
  async mounted() {
    this.initMap();
    await this.loadData();
    await this.loadScenarios();
    try { 
        await this.resetAll(); 
        await this.setTraffic('low', true); // Reset traffico all'avvio
    } catch(e) {}
  },
  methods: {
    // --- 1. INIZIALIZZAZIONE & MAPPA ---
    initMap() {
      this.map = markRaw(L.map('map').setView([46.0665, 11.1216], 15));
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
      
      // Ordine Layer (Z-Index implicito)
      this.layers.iso = markRaw(L.layerGroup().addTo(this.map));
      this.layers.base = markRaw(L.layerGroup().addTo(this.map));
      this.layers.route = markRaw(L.layerGroup().addTo(this.map));
      this.layers.pins = markRaw(L.layerGroup().addTo(this.map));
      
      this.map.on('click', this.onMapClick);
    },

    async loadData() {
      try {
        const res = await fetch('/grafo_optimized.geojson');
        if(!res.ok) throw new Error("File GeoJSON non trovato");
        const data = await res.json();
        
        L.geoJSON(data, {
          style: f => this.getStyle(f),
          onEachFeature: (f, l) => {
            const rawId = f.properties.desvia || f.properties.name || "unknown";
            const id = this.normalizeId(rawId);
            l.bindTooltip(rawId, { sticky: true });
            
            // Eventi interattivi
            l.on('contextmenu', e => { L.DomEvent.stopPropagation(e); this.toggleStreet(rawId); });
            l.on('mouseover', () => { if(!this.currentClosedIds.includes(id)) l.setStyle({color:'#f39c12', weight:6}); });
            l.on('mouseout', () => l.setStyle(this.getStyle(f)));
          }
        }).addTo(this.layers.base);
      } catch (err) { this.errorMessage = "Errore caricamento mappa: " + err.message; }
    },

    getStyle(f) {
      const id = this.normalizeId(f.properties.desvia || f.properties.name || "unknown");
      const closed = this.currentClosedIds.includes(id);
      return { color: closed ? '#e74c3c' : '#3388ff', weight: closed ? 5 : 4, opacity: closed ? 0.8 : 0.4 };
    },

    // --- 2. LOGICA TRAFFICO ---
    async setTraffic(level, silent=false) {
        if(this.isLoading && !silent) return;
        if(!silent) this.isLoading = true;
        try {
            await fetch(`${API_BASE_URL}/set-traffic/${level}`, {method: 'POST'});
            this.currentTraffic = level;
            // Ricalcola vista corrente se necessario
            if(!silent) {
                if (this.isIsochroneMode && this.lastIsoCenter) await this.getIsochrone(true);
                else if (this.nodes.length === 2) await this.getRoute(true);
            }
        } catch(e) { this.errorMessage = "Errore cambio traffico"; }
        finally { if(!silent) this.isLoading = false; }
    },

    // --- 3. INTERAZIONI UTENTE ---
    async onMapClick(e) {
      if (this.isLoading) return; 
      if (this.isIsochroneMode) {
        this.resetMapStates();
        this.lastIsoCenter = e.latlng;
        L.marker(e.latlng).addTo(this.layers.pins);
        this.getIsochrone();
      } else {
        if (this.nodes.length >= 2) this.resetMapStates();
        this.nodes.push(e.latlng);
        L.circleMarker(e.latlng, {radius:8, color:'white', fillColor: this.nodes.length===1 ? '#27ae60' : '#c0392b', fillOpacity:1}).addTo(this.layers.pins);
        if (this.nodes.length === 2) this.getRoute();
      }
    },

    // --- 4. API CALLS (ROUTING & ISO) ---
    async getRoute(skipLock = false) {
      if (this.isLoading && !skipLock) return;
      if (!skipLock) this.isLoading = true;
      this.errorMessage = ''; 
      this.layers.route.clearLayers();
      try {
        const payload = { start: [this.nodes[0].lat, this.nodes[0].lng], end: [this.nodes[1].lat, this.nodes[1].lng] };
        const res = await fetch(`${API_BASE_URL}/calculate-route`, {
          method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Percorso non trovato");
        const d = await res.json();
        
        if (d.path && d.path.length > 0) {
            const cleanPath = d.path.filter(p => Array.isArray(p) && p.length === 2);
            L.polyline(cleanPath, { color:'#27ae60', weight:7, interactive: false }).addTo(this.layers.route);
            this.routeStats = d.stats;
            this.routeInstructions = d.instructions || [];
        }
      } catch(e) { this.errorMessage = e.message; } 
      finally { if (!skipLock) this.isLoading = false; }
    },

    async getIsochrone(skipLock = false) {
      if(!this.lastIsoCenter) return;
      if (!skipLock) this.isLoading = true;
      this.layers.iso.clearLayers();
      try {
        const res = await fetch(`${API_BASE_URL}/calculate-isochrone`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ center: [this.lastIsoCenter.lat, this.lastIsoCenter.lng], minutes: this.isochroneMinutes })
        });
        const geo = await res.json();
        // Colore dinamico in base al traffico
        const color = this.currentTraffic === 'high' ? '#e74c3c' : (this.currentTraffic === 'medium' ? '#f39c12' : '#9b59b6');
        L.geoJSON(geo, { style: {color: color, fillColor: color, fillOpacity:0.4, weight:0}, interactive: false }).addTo(this.layers.iso);
      } catch(e) {} finally { if (!skipLock) this.isLoading = false; }
    },

    // --- 5. API CALLS (CHIUSURE & SCENARI) ---
    async toggleStreet(id) {
      if (this.isLoading) return;
      this.isLoading = true;
      try {
        const res = await fetch(`${API_BASE_URL}/toggle-closure/${encodeURIComponent(id)}`, {method:'POST'});
        const d = await res.json();
        this.currentClosedIds = d.current;
        this.closedCount = this.currentClosedIds.length;
        this.layers.base.eachLayer(l => { if (l.feature) l.setStyle(this.getStyle(l.feature)); });
        
        if (!this.isIsochroneMode && this.nodes.length === 2) await this.getRoute(true); 
        else if (this.isIsochroneMode && this.lastIsoCenter) await this.getIsochrone(true);
      } catch(e) { this.errorMessage = "Errore toggle"; } 
      finally { this.isLoading = false; }
    },

    async resetAll() { 
        if(this.isLoading) return;
        this.isLoading = true;
        try {
            await fetch(`${API_BASE_URL}/reset-closures`, {method:'POST'});
            this.currentClosedIds=[]; this.closedCount=0; 
            this.layers.base.eachLayer(l => { if (l.feature) l.setStyle(this.getStyle(l.feature)); });
            this.resetMapStates(); 
        } catch(e) {} finally { this.isLoading = false; }
    },

    async loadScenarios() {
        try {
            const res = await fetch(`${API_BASE_URL}/scenarios`);
            if(res.ok) this.scenarios = await res.json();
        } catch(e) {}
    },

    async saveScenario() {
        if(!this.newScenarioName) return;
        this.isLoading = true;
        try {
            const payload = { name: this.newScenarioName, closed_ids: this.currentClosedIds };
            const res = await fetch(`${API_BASE_URL}/scenarios`, {
                method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
            });
            if(res.ok) { this.newScenarioName = ""; await this.loadScenarios(); }
        } catch(e) { this.errorMessage = "Errore salvataggio"; }
        finally { this.isLoading = false; }
    },

    async applyScenario(id) {
        this.isLoading = true;
        try {
            const res = await fetch(`${API_BASE_URL}/scenarios/${id}/apply`, { method: 'POST' });
            if(res.ok) await this.loadCurrentClosuresFromBackend();
        } catch(e) { this.errorMessage = "Errore applicazione"; }
        finally { this.isLoading = false; }
    },

    async deleteScenario(id) {
        if(!confirm("Eliminare?")) return;
        this.isLoading = true;
        try {
            await fetch(`${API_BASE_URL}/scenarios/${id}`, { method: 'DELETE' });
            await this.loadScenarios();
        } catch(e) {} finally { this.isLoading = false; }
    },

    // --- HELPER ---
    normalizeId(id) { return String(id || "").trim().toLowerCase(); },
    
    async loadCurrentClosuresFromBackend() {
        const res = await fetch(`${API_BASE_URL}/toggle-closure/DUMMY_REFRESH`, {method:'POST'});
        const d = await res.json();
        this.currentClosedIds = d.current.filter(x => x !== 'dummy_refresh');
        this.closedCount = this.currentClosedIds.length;
        this.layers.base.eachLayer(l => { if (l.feature) l.setStyle(this.getStyle(l.feature)); });
        if(this.nodes.length === 2) this.getRoute(true);
    },

    updateIsochrone() { if(this.lastIsoCenter && !this.isLoading) this.getIsochrone(); },
    setMode(m) { this.isIsochroneMode = m; this.resetMapStates(); },
    resetMapStates() { 
        if(this.map) this.map.stop();
        this.layers.pins.clearLayers(); 
        this.layers.route.clearLayers(); 
        this.layers.iso.clearLayers(); 
        this.nodes=[]; this.routeStats=null; this.routeInstructions=[]; this.lastIsoCenter=null; 
    },
    fmtTime(val) { 
        if (!val) return "0 sec";
        const sec = Math.round(val * 60);
        return sec < 60 ? `${sec} sec` : `${Math.floor(sec / 60)} min ${sec % 60} s`;
    },
    fmtDist(val) {
        if (!val) return "0 m";
        return val >= 1000 ? `${(val/1000).toFixed(2)} km` : `${Math.round(val)} m`;
    },
    async searchAddr() { 
        if(!this.searchQuery || this.isLoading) return; 
        this.isLoading = true;
        try {
            const r=await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${this.searchQuery}`); 
            this.searchResults=await r.json(); 
        } catch(e) { this.errorMessage = "Ricerca indirizzo fallita"; } finally { this.isLoading = false; }
    },
    flyTo(r) { this.map.flyTo([r.lat, r.lon], 17); this.searchResults=[]; },
  }
}
</script>

<style scoped>
/* STILI DEL CONTENITORE */
.map-container { position: relative; width: 100%; height: 100vh; font-family: 'Segoe UI', sans-serif; }
.map-container.waiting * { cursor: wait !important; }
#map { width: 100%; height: 100%; }

/* STILI PANNELLO */
.control-panel { 
    position: absolute; top: 10px; right: 10px; width: 340px; 
    background: white; padding: 15px; border-radius: 8px; 
    box-shadow: 0 4px 12px rgba(0,0,0,0.2); 
    max-height: 90vh; overflow-y: auto; z-index: 1000; 
}
.panel-header h3 { margin: 0 0 5px 0; color: #2c3e50; font-size: 18px; }
.subtitle { font-size: 11px; color: #7f8c8d; text-transform: uppercase; letter-spacing: 1px; }
.loader { float: right; animation: spin 1s infinite; }

/* TRAFFICO */
.traffic-box { margin: 10px 0; background: #f8f9fa; padding: 8px; border-radius: 6px; border: 1px solid #eee; display: flex; align-items: center; justify-content: space-between; }
.traffic-btns { display: flex; gap: 4px; }
.tr-btn { border: 1px solid #ddd; background: white; padding: 5px; cursor: pointer; border-radius: 4px; font-size: 14px; transition: transform 0.1s; }
.tr-btn:hover { transform: scale(1.1); }
.tr-btn.active { background: #ecf0f1; border-color: #bdc3c7; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1); transform: scale(0.95); }

/* ERRORI */
.error-banner { background: #fee; color: #c0392b; padding: 8px; border: 1px solid #f5c6cb; border-radius: 4px; margin-bottom: 10px; font-size: 12px; display: flex; justify-content: space-between; }
.close-err { background:none; border:none; cursor:pointer; font-weight:bold; }

/* BOTTONI MODALITÀ */
.mode-switcher { display: flex; background: #f0f0f0; padding: 4px; border-radius: 6px; margin: 15px 0; }
.mode-btn { flex: 1; border: none; background: transparent; padding: 8px; cursor: pointer; font-weight: 600; color: #7f8c8d; font-size: 13px; }
.mode-btn.active { background: white; color: #2c3e50; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-radius: 4px; }

/* KPI & ISTRUZIONI */
.kpi-box { border: 1px solid #ddd; border-radius: 4px; padding: 10px; margin: 10px 0; background: #fafafa; }
.kpi-row { display: flex; justify-content: space-between; margin-bottom: 5px; align-items: flex-end; font-size: 14px; }
.kpi-val { text-align: right; display: flex; flex-direction: column; }
.kpi-val small { font-size: 0.85em; color: #666; }
.bad { color: #c0392b; font-weight: bold; }

.search-box, .save-row { display: flex; gap: 5px; margin-bottom: 5px; }
input { flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; }
button { background: #2c3e50; color: white; border: none; padding: 0 12px; border-radius: 4px; cursor: pointer; transition: background 0.2s; }
button:hover { background: #34495e; }
button:disabled { opacity: 0.5; cursor: not-allowed; }

.results-list { list-style: none; padding: 0; border: 1px solid #eee; margin: 0; max-height: 100px; overflow-y: auto; }
.results-list li { padding: 8px; cursor: pointer; background: white; border-bottom: 1px solid #eee; font-size: 13px; }
.results-list li:hover { background: #f9f9f9; }

.closures-box ul, .scenario-box ul { list-style: none; padding: 0; margin-top: 10px; }
.closures-box li, .scenario-box li { display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f8f9fa; margin-bottom: 5px; border-radius: 4px; font-size: 13px; border: 1px solid #eee; }
.truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }
.box-header { font-weight: 600; font-size: 13px; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center; }
.btn-reset { background: #e74c3c; font-size: 11px; padding: 3px 8px; }
.btn-icon { background: white; border: 1px solid #ccc; color: #333; padding: 3px 8px; font-size: 11px; }
.btn-del { background: #e74c3c; margin-left: 5px; }

/* SCENARI */
.scenario-box { margin-top: 15px; border-top: 2px dashed #eee; padding-top: 15px; }
.scenario-box h4 { margin: 0 0 10px 0; font-size: 14px; color: #2c3e50; }
.sc-info { display: flex; flex-direction: column; }
.sc-info small { color: #7f8c8d; font-size: 11px; }

.slider { width: 100%; margin: 10px 0; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* ISTRUZIONI SCROLLABLE */
.instructions-box { margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; background: white; max-height: 180px; overflow-y: auto; }
.instructions-box h4 { margin: 0; padding: 8px; background: #f1f2f6; font-size: 12px; color: #57606f; text-transform: uppercase; border-bottom: 1px solid #ddd; position: sticky; top: 0; }
.step-list { list-style: none; padding: 0; margin: 0; }
.step-list li { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center; font-size: 13px; }
.step-icon { margin-right: 8px; font-size: 14px; }
.step-info { display: flex; flex-direction: column; }
.step-name { font-weight: 500; color: #2f3542; }
.step-dist { font-size: 11px; color: #747d8c; }
.step-end { font-weight: bold; color: #27ae60; background: #eafaf1; }
.no-steps { padding: 10px; font-size: 12px; color: #c0392b; text-align: center; }
</style>