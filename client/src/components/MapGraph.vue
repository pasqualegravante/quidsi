<template>
  <div class="map-container" :class="{ 'waiting': isLoading }">
    <div id="map" ref="mapRef" @contextmenu.prevent></div>
    
    <div class="control-panel">
      <div class="panel-header">
        <h3>QuidSI Enterprise</h3>
        <span class="subtitle">Supporto Decisionale v3.3</span>
        <span v-if="isLoading" class="loader">⏳</span>
      </div>

      <div class="panel-body">
        
        <div class="mode-switcher">
          <button :class="['mode-btn', { active: !isIsochroneMode }]" @click="setMode(false)">Calcolo Percorso</button>
          <button :class="['mode-btn', { active: isIsochroneMode }]" @click="setMode(true)">Analisi Copertura</button>
        </div>

        <div v-if="isIsochroneMode" class="isochrone-controls">
          <label>Raggio Temporale: <strong>{{ isochroneMinutes }} min</strong></label>
          <input type="range" v-model.number="isochroneMinutes" min="1" max="15" step="1" @input="updateIsochrone" class="slider" :disabled="isLoading" />
          <p class="hint">Clicca sulla mappa per vedere l'area raggiungibile.</p>
        </div>

        <div class="search-section">
          <div class="search-box">
            <input v-model="searchQuery" placeholder="Cerca indirizzo..." @keyup.enter="searchAddr" :disabled="isLoading" />
            <button @click="searchAddr" :disabled="isLoading">Cerca</button>
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
            <span>Attuale:</span> 
            <div class="kpi-val">
               <strong>{{ fmtTime(routeStats.real.time) }}</strong>
               <small>{{ fmtDist(routeStats.real.dist) }}</small>
            </div>
          </div>
          <div v-if="routeStats.delta.time > 0" class="kpi-row bad">
            <span>Ritardo:</span> 
            <div class="kpi-val">
               <strong>+{{ fmtTime(routeStats.delta.time) }}</strong>
               <small>+{{ fmtDist(routeStats.delta.dist) }}</small>
            </div>
          </div>
          <div v-else class="kpi-row good"><span>Stato:</span> Ottimale</div>
        </div>

        <div class="closures-box">
          <div class="box-header">
             Strade Chiuse ({{ closedCount }}) 
             <button @click="resetAll" v-if="closedCount" class="btn-reset" :disabled="isLoading">Ripristina</button>
          </div>
          <ul>
            <li v-for="id in currentClosedIds" :key="id">
              <span>{{ id }}</span> <button @click="toggleStreet(id)" class="btn-icon" :disabled="isLoading">Apri</button>
            </li>
          </ul>
        </div>

        <hr />

        <div class="scenario-box">
          <h4>Scenari Salvati</h4>
          <div v-if="closedCount" class="save-row">
            <input v-model="newScenarioName" placeholder="Nome scenario" :disabled="isLoading" />
            <button @click="saveScenario" :disabled="isLoading">Salva</button>
          </div>
          <ul>
            <li v-for="s in scenarios" :key="s._id">
              <span>{{ s.name }}</span>
              <div>
                <button @click="loadScenario(s._id)" class="btn-load" :disabled="isLoading">Carica</button>
                <button @click="delScenario(s._id)" class="btn-del" :disabled="isLoading">Elimina</button>
              </div>
            </li>
          </ul>
        </div>

      </div>
    </div>
  </div>
</template>

<script>
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import icon from 'leaflet/dist/images/marker-icon.png';
import shadow from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: iconRetina, iconUrl: icon, shadowUrl: shadow });

export default {
  data() {
    return {
      map: null,
      nodes: [],
      layers: { base: null, route: null, iso: null, pins: null },
      routeStats: null,
      closedCount: 0,
      currentClosedIds: [],
      scenarios: [],
      newScenarioName: "",
      searchQuery: "",
      searchResults: [],
      isIsochroneMode: false,
      isochroneMinutes: 5,
      lastIsoCenter: null,
      isLoading: false
    }
  },
  async mounted() {
    this.initMap();
    this.loadData();
    this.loadScenarios();
    await this.resetAll(); 
  },
  methods: {
    initMap() {
      this.map = L.map('map').setView([46.0665, 11.1216], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
      
      this.layers.iso = L.layerGroup().addTo(this.map);
      this.layers.base = L.layerGroup().addTo(this.map);
      this.layers.route = L.layerGroup().addTo(this.map);
      this.layers.pins = L.layerGroup().addTo(this.map);
      
      this.map.on('click', this.onMapClick);
    },

    normalizeId(id) {
        return String(id || "").trim().toLowerCase();
    },

    async loadData() {
      const res = await fetch('/grafo_optimized.geojson');
      const data = await res.json();
      L.geoJSON(data, {
        style: f => this.getStyle(f),
        onEachFeature: (f, l) => {
          const rawId = f.properties.desvia || f.properties.name || "unknown";
          l.bindTooltip(rawId, { sticky: true });
          const id = this.normalizeId(rawId);
          l.on('contextmenu', e => { L.DomEvent.stopPropagation(e); this.toggleStreet(rawId); });
          l.on('mouseover', () => { if(!this.currentClosedIds.includes(id)) l.setStyle({color:'#f39c12', weight:6}); });
          l.on('mouseout', () => l.setStyle(this.getStyle(f)));
        }
      }).addTo(this.layers.base);
    },

    getStyle(f) {
      const id = this.normalizeId(f.properties.desvia || f.properties.name || "unknown");
      const closed = this.currentClosedIds.includes(id);
      return { color: closed ? '#e74c3c' : '#3388ff', weight: closed ? 5 : 4, opacity: closed ? 0.8 : 0.4 };
    },

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
        L.circleMarker(e.latlng, {radius:8, color:'white', fillColor:'#2980b9', fillOpacity:1}).addTo(this.layers.pins);
        if (this.nodes.length === 2) this.getRoute();
      }
    },

    // Parametro skipLock: se true, ignora il controllo isLoading (usato da toggleStreet)
    async getRoute(skipLock = false) {
      if (this.isLoading && !skipLock) return;
      if (!skipLock) this.isLoading = true; // Setta lock solo se chiamato esternamente
      
      try {
        const res = await fetch('http://localhost:4000/api/calculate-route', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ start: [this.nodes[0].lat, this.nodes[0].lng], end: [this.nodes[1].lat, this.nodes[1].lng] })
        });
        
        if (!res.ok) {
            if (res.status === 404) {
                alert("Percorso interrotto: impossibile raggiungere la destinazione con le attuali chiusure.");
                this.layers.route.clearLayers();
                this.routeStats = null; // Resetta stats vecchie
            }
            return;
        }

        const d = await res.json();
        this.layers.route.clearLayers();
        if (d.path && d.path.length > 0) {
            const poly = L.polyline(d.path, { color:'#27ae60', weight:7, interactive: false }).addTo(this.layers.route);
            if (poly.getLatLngs().length > 0) this.map.fitBounds(poly.getBounds(), { padding: [50, 50] });
            this.routeStats = d.stats;
        }
      } catch(e) { console.error(e); } 
      finally { 
          if (!skipLock) this.isLoading = false; // Rilascia lock solo se preso esternamente
      }
    },

    async getIsochrone(skipLock = false) {
      if(!this.lastIsoCenter || (this.isLoading && !skipLock)) return;
      if (!skipLock) this.isLoading = true;
      this.layers.iso.clearLayers();
      
      try {
        const res = await fetch('http://localhost:4000/api/calculate-isochrone', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ center: [this.lastIsoCenter.lat, this.lastIsoCenter.lng], minutes: this.isochroneMinutes })
        });
        const geo = await res.json();
        L.geoJSON(geo, { style: {color:'#8e44ad', fillColor:'#9b59b6', fillOpacity:0.4, weight:0}, interactive: false }).addTo(this.layers.iso);
      } catch(e) { console.error(e); } 
      finally { if (!skipLock) this.isLoading = false; }
    },

    async toggleStreet(id) {
      // 1. ACQUISIZIONE LOCK (Blocca tutto finché non abbiamo finito ANCHE il ricalcolo)
      if (this.isLoading) return;
      this.isLoading = true;
      
      try {
        const res = await fetch(`http://localhost:4000/api/toggle-closure/${encodeURIComponent(id)}`, {method:'POST'});
        const d = await res.json();
        this.currentClosedIds = d.currently_closed;
        this.closedCount = d.closed_count;
        
        // Aggiorna grafica mappa (Rosso/Blu)
        this.layers.base.eachLayer(l => l.feature && l.setStyle(this.getStyle(l.feature)));
        
        // 2. RICALCOLO SEQUENZIALE (Attendiamo che finisca prima di sbloccare)
        // Passiamo 'true' per dire "Ignora il fatto che isLoading è true, sono io che ti chiamo!"
        if (!this.isIsochroneMode && this.nodes.length === 2) {
            await this.getRoute(true); 
        } else if (this.isIsochroneMode && this.lastIsoCenter) {
            await this.getIsochrone(true);
        }
      
      } catch(e) { console.error(e); } 
      finally { 
        // 3. RILASCIO LOCK (Solo alla fine di tutto)
        this.isLoading = false; 
      }
    },

    updateIsochrone() { if(this.lastIsoCenter && !this.isLoading) this.getIsochrone(); },
    setMode(m) { this.isIsochroneMode = m; this.resetMapStates(); },
    
    resetMapStates() { 
        this.layers.pins.clearLayers(); 
        this.layers.route.clearLayers(); 
        this.layers.iso.clearLayers(); 
        this.nodes=[]; 
        this.routeStats=null; 
        this.lastIsoCenter=null; 
    },
    
    resetAll() { 
        if(this.isLoading) return;
        this.isLoading = true;
        fetch('http://localhost:4000/api/reset-closures', {method:'POST'}).then(() => { 
            this.currentClosedIds=[]; 
            this.closedCount=0; 
            this.layers.base.eachLayer(l=>l.setStyle(this.getStyle(l.feature))); 
            this.resetMapStates(); 
        }).finally(() => { this.isLoading = false; });
    },
    
    fmtTime(val) { 
        if (!val) return "0 sec";
        const sec = Math.round(val * 60);
        if (sec < 60) return `${sec} sec`;
        const min = Math.floor(sec / 60);
        const remSec = sec % 60;
        return remSec > 0 ? `${min} min ${remSec} s` : `${min} min`;
    },
    fmtDist(val) {
        if (!val) return "0 m";
        if (val >= 1000) return `${(val/1000).toFixed(2)} km`;
        return `${Math.round(val)} m`;
    },
    async searchAddr() { 
        if(!this.searchQuery || this.isLoading) return; 
        this.isLoading = true;
        try {
            const r=await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${this.searchQuery}`); 
            this.searchResults=await r.json(); 
        } finally { this.isLoading = false; }
    },
    flyTo(r) { this.map.flyTo([r.lat, r.lon], 17); this.searchResults=[]; },
    async loadScenarios() { const r=await fetch('http://localhost:4000/api/scenarios'); this.scenarios=await r.json(); },
    async saveScenario() { 
        if(!this.newScenarioName || this.isLoading) return;
        this.isLoading = true;
        await fetch('http://localhost:4000/api/scenarios', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:this.newScenarioName, closed_ids:this.currentClosedIds})}); 
        this.loadScenarios(); 
        this.newScenarioName = "";
        this.isLoading = false;
    },
    async loadScenario(id) { 
        if(this.isLoading) return;
        this.isLoading = true;
        await fetch(`http://localhost:4000/api/scenarios/${id}/apply`, {method:'POST'}); 
        const s=this.scenarios.find(x=>x._id===id); 
        if(s){ this.currentClosedIds=s.closed_ids; this.closedCount=s.closed_ids.length; this.layers.base.eachLayer(l=>l.setStyle(this.getStyle(l.feature))); }
        this.isLoading = false;
    },
    async delScenario(id) { 
        if(!confirm("Eliminare?") || this.isLoading) return;
        this.isLoading = true;
        await fetch(`http://localhost:4000/api/scenarios/${id}`, {method:'DELETE'}); 
        this.loadScenarios(); 
        this.isLoading = false;
    }
  }
}
</script>

<style scoped>
.map-container { position: relative; width: 100%; height: 100vh; font-family: 'Segoe UI', sans-serif; }
.map-container.waiting, .map-container.waiting button, .map-container.waiting input { cursor: wait !important; }
#map { width: 100%; height: 100%; }
.control-panel { position: absolute; top: 10px; right: 10px; width: 320px; background: white; padding: 15px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); max-height: 90vh; overflow-y: auto; z-index: 1000; }
.panel-header h3 { margin: 0 0 5px 0; color: #2c3e50; }
.subtitle { font-size: 12px; color: #7f8c8d; text-transform: uppercase; }
.loader { float: right; animation: spin 1s infinite; }
.mode-switcher { display: flex; background: #f0f0f0; padding: 5px; border-radius: 6px; margin: 15px 0; }
.mode-btn { flex: 1; border: none; background: transparent; padding: 8px; cursor: pointer; font-weight: 600; color: #7f8c8d; }
.mode-btn.active { background: white; color: #2c3e50; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-radius: 4px; }
.kpi-box { border: 1px solid #ddd; border-radius: 4px; padding: 10px; margin: 10px 0; background: #fafafa; }
.kpi-row { display: flex; justify-content: space-between; margin-bottom: 5px; align-items: flex-end;}
.kpi-val { text-align: right; display: flex; flex-direction: column; }
.kpi-val small { font-size: 0.85em; color: #666; }
.bad { color: #c0392b; font-weight: bold; }
.good { color: #27ae60; font-weight: bold; }
.search-box { display: flex; gap: 5px; margin-bottom: 5px; }
.search-box input { flex: 1; padding: 6px; border: 1px solid #ddd; border-radius: 4px; }
.search-box button { background: #2c3e50; color: white; border: none; padding: 0 10px; border-radius: 4px; }
button:disabled, input:disabled { opacity: 0.6; cursor: not-allowed; }
.results-list { list-style: none; padding: 0; border: 1px solid #eee; margin: 0; max-height: 100px; overflow-y: auto; }
.results-list li { padding: 6px; cursor: pointer; background: white; border-bottom: 1px solid #eee; font-size: 13px; }
.results-list li:hover { background: #f9f9f9; }
.closures-box ul, .scenario-box ul { list-style: none; padding: 0; margin-top: 10px; }
.closures-box li, .scenario-box li { display: flex; justify-content: space-between; align-items: center; padding: 6px; background: #f8f9fa; margin-bottom: 4px; border-radius: 4px; font-size: 13px; border: 1px solid #eee; }
.btn-reset { background: #e74c3c; color: white; border: none; padding: 2px 6px; border-radius: 3px; font-size: 10px; }
.btn-icon { background: none; border: 1px solid #ccc; cursor: pointer; padding: 2px 6px; font-size: 11px; border-radius: 3px; }
.save-row { display: flex; gap: 5px; margin-bottom: 5px; }
.save-row input { flex: 1; padding: 5px; border: 1px solid #ddd; border-radius: 4px; }
.save-row button { background: #2c3e50; color: white; border: none; padding: 5px 10px; border-radius: 4px; }
.btn-load { background: #27ae60; color: white; border: none; padding: 3px 8px; border-radius: 3px; margin-right: 3px; font-size: 11px; }
.btn-del { background: #c0392b; color: white; border: none; padding: 3px 8px; border-radius: 3px; font-size: 11px; }
.slider { width: 100%; margin: 10px 0; }
.hint { font-size: 11px; color: #888; font-style: italic; margin: 0; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
</style>