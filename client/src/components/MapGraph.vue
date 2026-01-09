<template>
  <div class="map-container">
    <div id="map" ref="mapRef" @contextmenu.prevent></div>
    
    <div class="control-panel">
      <div class="panel-header">
        <h3>QuidSI Enterprise</h3>
        <span class="subtitle">Advanced GIS Operations</span>
      </div>

      <div class="panel-body">

        <div class="search-section">
          <div class="search-box-wrapper">
            <input v-model="searchQuery" placeholder="Cerca indirizzo..." class="search-input" @keyup.enter="searchAddress" />
            <button @click="searchAddress" class="btn-search">🔍</button>
          </div>
          <ul v-if="searchResults.length > 0" class="search-results">
            <li v-for="(res, index) in searchResults" :key="index" @click="flyToLocation(res)">
              <strong>{{ res.display_name.split(',')[0] }}</strong>
            </li>
          </ul>
        </div>
        
        <hr>

        <div v-if="routeStats" class="kpi-container">
          <div class="kpi-row main">
            <span class="label">Attuale</span>
            <div class="values"><strong>{{ formatTime(routeStats.real.time) }}</strong><small>{{ formatDist(routeStats.real.dist) }}</small></div>
          </div>
          <div v-if="hasImpact" class="kpi-row delta bad">
            <span class="label">⚠️ Delta</span>
            <div class="values"><span>+{{ formatTime(routeStats.delta.time) }}</span><small>+{{ formatDist(routeStats.delta.dist) }}</small></div>
          </div>
          <div v-else class="kpi-row delta good"><span class="label">✅ Status</span><div class="values">OK</div></div>
        </div>

        <div class="closures-manager">
          <div class="section-title">
            🚧 Gestione Blocchi ({{ closedCount }})
            <button v-if="closedCount > 0" @click="resetAllClosures" class="btn-xs del-all">Reset Tutto</button>
          </div>

          <ul v-if="closedCount > 0" class="closure-list">
            <li v-for="id in currentClosedIds" :key="id" class="closure-item">
              <span>{{ id }}</span>
              <button @click="toggleStreet(id)" class="btn-icon" title="Riapri strada">♻️</button>
            </li>
          </ul>
          <div v-else class="info-box">
            Nessuna strada chiusa.<br>Tasto destro sulla mappa per chiudere.
          </div>
        </div>

        <hr>

        <div class="scenario-manager">
          <h4>💾 Scenari</h4>
          <div v-if="closedCount > 0" class="save-form">
            <input v-model="newScenarioName" placeholder="Nome scenario..." class="input-text" />
            <button @click="saveScenario" class="btn btn-primary" :disabled="isSaving">{{ saveBtnText }}</button>
          </div>
          <ul class="scenario-list">
            <li v-for="scen in scenarios" :key="scen._id" class="scenario-item">
              <div class="scen-info"><strong>{{ scen.name }}</strong><small>{{ scen.closed_ids.length }} blocchi</small></div>
              <div class="scen-actions">
                <button @click="loadScenario(scen._id)" class="btn-xs load">Load</button>
                <button @click="deleteScenario(scen._id)" class="btn-xs del">X</button>
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
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

export default {
  name: 'MapGraph',
  data() {
    return {
      map: null,
      nodes: [],
      // Array per tenere traccia dei marker grafici (per poterli spostare col snapping)
      markerObjects: [], 
      layers: { streets: null, route: null, search: null },
      
      routeStats: null, 
      closedCount: 0,
      currentClosedIds: [],
      
      scenarios: [],
      newScenarioName: "",
      isSaving: false,
      saveBtnText: "Salva",
      searchQuery: "",
      searchResults: []
    }
  },
  computed: {
    hasImpact() { return this.routeStats && this.routeStats.delta.time > 0; }
  },
  mounted() {
    this.initMap();
    this.loadMapData();
    this.fetchScenarios();
  },
  methods: {
    initMap() {
      this.map = L.map(this.$refs.mapRef, { zoomControl: true }).setView([46.0665, 11.1216], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
      
      this.layers.streets = L.layerGroup().addTo(this.map);
      this.layers.route = L.layerGroup().addTo(this.map);
      this.layers.search = L.layerGroup().addTo(this.map);
      
      this.map.on('click', this.onMapClick);
    },

    async loadMapData() {
      try {
        const res = await fetch('/grafo_optimized.geojson');
        const data = await res.json();
        L.geoJSON(data, {
          style: (f) => this.getStreetStyle(f),
          onEachFeature: (f, layer) => {
            const id = String(f.properties.desvia || f.properties.name || f.properties.id || "unknown").trim();
            layer.bindTooltip(`<b>${id}</b>`, { permanent: false, direction: 'top', className: 'street-label' });
            
            // --- FEATURE MIGLIORATA: Highlight Hover ---
            layer.on('mouseover', () => {
                if(!this.currentClosedIds.includes(id)) layer.setStyle({ color: '#f39c12', weight: 6, opacity: 1 });
            });
            layer.on('mouseout', () => {
                layer.setStyle(this.getStreetStyle(f));
            });
            // ------------------------------------------

            layer.on('contextmenu', (e) => {
              L.DomEvent.stopPropagation(e);
              this.toggleStreet(id);
            });
          }
        }).addTo(this.layers.streets);
      } catch (err) { console.error(err); }
    },

    getStreetStyle(f) {
      const id = String(f.properties.desvia || f.properties.name || f.properties.id || "unknown").trim();
      const isClosed = this.currentClosedIds.includes(id);
      return { 
          color: isClosed ? '#e74c3c' : '#3388ff', 
          weight: isClosed ? 5 : 4, 
          opacity: isClosed ? 0.8 : 0.4, 
          dashArray: isClosed ? '5, 10' : null 
      };
    },

    async onMapClick(e) {
      this.layers.search.clearLayers();
      if (this.nodes.length >= 2) this.resetMarkers();
      
      this.nodes.push(e.latlng);
      
      // Creiamo il marker
      const color = this.nodes.length === 1 ? '#2980b9' : '#c0392b';
      const mk = L.circleMarker(e.latlng, { radius: 8, fillColor: color, color: '#fff', weight: 2, fillOpacity: 1 }).addTo(this.map);
      this.markerObjects.push(mk);

      if (this.nodes.length === 2) this.getRoute();
    },

    async getRoute() {
      try {
        const res = await fetch('http://localhost:4000/api/calculate-route', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ start: [this.nodes[0].lat, this.nodes[0].lng], end: [this.nodes[1].lat, this.nodes[1].lng] })
        });
        const data = await res.json();
        
        if (data.path) {
            this.drawRoute(data.path);
            this.routeStats = data.stats;
            
            // --- FEATURE SNAPPING ---
            // Se il backend ci restituisce i punti snappati, spostiamo i marker visivi lì
            if(data.snapped_points && this.markerObjects.length === 2) {
                // Backend ritorna [lat, lng]
                this.markerObjects[0].setLatLng(data.snapped_points.start);
                this.markerObjects[1].setLatLng(data.snapped_points.end);
                // Aggiorniamo anche i nodi logici per coerenza
                this.nodes[0] = L.latLng(data.snapped_points.start);
                this.nodes[1] = L.latLng(data.snapped_points.end);
            }
        }
      } catch (e) { alert("Errore calcolo percorso."); }
    },

    drawRoute(path) {
      this.layers.route.clearLayers();
      const poly = L.polyline(path, { color: '#27ae60', weight: 7, opacity: 0.9, interactive: false }).addTo(this.layers.route);
      setTimeout(() => { if (this.map) this.map.fitBounds(poly.getBounds(), {padding: [50, 50]}); }, 100);
    },

    async toggleStreet(id) {
      // API call
      const res = await fetch(`http://localhost:4000/api/toggle-closure/${encodeURIComponent(id)}`, { method: 'POST' });
      const data = await res.json();
      this.closedCount = data.closed_count;
      this.currentClosedIds = data.currently_closed;
      
      this.refreshMapStyles();
      if (this.nodes.length === 2) this.getRoute();
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
          if (layer.feature) {
              // Reset stile forzato per togliere eventuali highlight rimasti
              layer.setStyle(this.getStreetStyle(layer.feature)); 
          }
      });
    },

    resetMarkers() {
      // Rimuovi i marker dalla mappa usando l'array di oggetti Leaflet
      this.markerObjects.forEach(mk => this.map.removeLayer(mk));
      this.markerObjects = [];
      this.layers.route.clearLayers();
      this.nodes = [];
      this.routeStats = null;
    },

    // --- UTILITIES (Uguali a prima) ---
    async searchAddress() {
      if (!this.searchQuery) return;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.searchQuery)}&limit=5`);
        this.searchResults = await res.json();
      } catch (e) { alert("Errore ricerca"); }
    },
    flyToLocation(result) {
        const lat = parseFloat(result.lat); const lon = parseFloat(result.lon);
        this.map.flyTo([lat, lon], 17, { duration: 1.5 });
        this.layers.search.clearLayers();
        L.marker([lat, lon]).addTo(this.layers.search).bindPopup(result.display_name.split(',')[0]).openPopup();
        this.searchResults = [];
    },
    // ... Scenari ...
    async fetchScenarios() { try { const res = await fetch('http://localhost:4000/api/scenarios'); if(res.ok) this.scenarios = await res.json(); } catch (e) {} },
    async saveScenario() {
      if (!this.newScenarioName) return alert("Inserisci nome");
      this.isSaving = true; this.saveBtnText = "Wait...";
      try {
        await fetch('http://localhost:4000/api/scenarios', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ name: this.newScenarioName, closed_ids: this.currentClosedIds }) });
        this.newScenarioName = ""; await this.fetchScenarios(); this.saveBtnText = "✅"; setTimeout(() => { this.saveBtnText = "Salva"; this.isSaving = false; }, 2000);
      } catch (e) { this.isSaving = false; }
    },
    async loadScenario(id) {
        await fetch(`http://localhost:4000/api/scenarios/${id}/apply`, { method: 'POST' });
        const s = this.scenarios.find(s => s._id === id);
        if(s) { this.currentClosedIds = s.closed_ids; this.closedCount = s.closed_ids.length; this.refreshMapStyles(); if(this.nodes.length===2) this.getRoute(); }
    },
    async deleteScenario(id) { if(confirm("Del?")) { await fetch(`http://localhost:4000/api/scenarios/${id}`, { method: 'DELETE' }); this.fetchScenarios(); } },
    
    formatTime(val) { return val ? `${Math.ceil(val)} min` : "0"; },
    formatDist(val) { return val > 1000 ? `${(val/1000).toFixed(2)} km` : `${Math.round(val || 0)} m`; }
  }
}
</script>

<style scoped>
/* STILI GENERALI (Preservati) */
.map-container { position: relative; width: 100%; height: 100vh; font-family: 'Segoe UI', sans-serif; }
#map { width: 100%; height: 100%; background: #e0e0e0; }
.control-panel { position: absolute; top: 10px; right: 10px; width: 340px; background: white; z-index: 1000; border-radius: 8px; padding: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); max-height: 90vh; overflow-y: auto; }
.panel-header h3 { margin: 0; color: #2c3e50; font-size: 20px; }
.subtitle { font-size: 11px; color: #7f8c8d; text-transform: uppercase; }

/* NUOVI STILI LISTA CHIUSURE */
.section-title { display: flex; justify-content: space-between; align-items: center; font-weight: bold; font-size: 13px; margin: 15px 0 10px; border-bottom: 2px solid #eee; padding-bottom: 5px;}
.closure-list { list-style: none; padding: 0; margin: 0; max-height: 150px; overflow-y: auto; border: 1px solid #eee; border-radius: 4px; }
.closure-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; border-bottom: 1px solid #f5f5f5; font-size: 13px; }
.closure-item:last-child { border-bottom: none; }
.closure-item:hover { background: #fff5f5; }
.btn-icon { background: none; border: none; cursor: pointer; font-size: 14px; transition: transform 0.2s; }
.btn-icon:hover { transform: scale(1.2); }
.del-all { background: #e74c3c; color: white; border: none; border-radius: 3px; cursor: pointer; padding: 2px 6px; font-size: 10px; }

/* SEARCH */
.search-box-wrapper { display: flex; gap: 5px; }
.search-input { flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
.btn-search { background: #2c3e50; color: white; border: none; border-radius: 4px; cursor: pointer; padding: 0 10px; }
.search-results { list-style: none; padding: 0; margin-top: 5px; border: 1px solid #eee; border-radius: 4px; max-height: 120px; overflow-y: auto; }
.search-results li { padding: 8px; border-bottom: 1px solid #eee; cursor: pointer; font-size: 13px; }
.search-results li:hover { background: #f0f0f0; }

/* KPI */
.kpi-container { margin: 15px 0; border: 1px solid #ddd; border-radius: 6px; }
.kpi-row { display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #eee; }
.kpi-row.main { background: #f8f9fa; }
.kpi-row.delta.bad { background: #fee2e2; color: #b91c1c; }
.kpi-row.delta.good { background: #dcfce7; color: #15803d; }
.values { text-align: right; display: flex; flex-direction: column; }
.info-box { font-size: 12px; color: #888; text-align: center; margin: 10px 0; font-style: italic; }

/* SCENARI */
.save-form { display: flex; gap: 5px; margin-bottom: 5px; }
.input-text { flex: 1; padding: 5px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; }
.scenario-item { background: #f9f9f9; padding: 8px; margin-bottom: 5px; border-radius: 4px; display: flex; justify-content: space-between; font-size: 13px; border: 1px solid #eee;}
.scen-info { display: flex; flex-direction: column; }
.scen-info small { color: #888; font-size: 10px; }
.btn-primary { background: #2c3e50; color: white; border: none; border-radius: 4px; cursor: pointer; }
.btn-xs { padding: 2px 6px; border: none; border-radius: 3px; margin-left: 2px; cursor: pointer; font-size: 11px; }
.btn-xs.load { background: #27ae60; color: white; }
.btn-xs.del { background: #c0392b; color: white; }
</style>