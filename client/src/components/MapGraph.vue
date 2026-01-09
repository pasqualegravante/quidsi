<template>
  <div class="map-container">
    <div id="map" ref="mapRef" @contextmenu.prevent></div>
    
    <div class="control-panel">
      <div class="panel-header">
        <h3>QuidSI</h3>
        <span class="subtitle">Decision Support System</span>
      </div>

      <div class="panel-body">
        <div v-if="routeInfo" class="stats-card">
          <div class="stat">
            <label>Distanza</label>
            <span class="value">{{ (routeInfo.distance / 1000).toFixed(2) }} km</span>
          </div>
          <div class="stat">
            <label>Tempo</label>
            <span class="value">{{ routeInfo.time }} min</span>
          </div>
        </div>

        <div v-if="closedCount > 0" class="warning-box">
          🚧 <strong>{{ closedCount }}</strong> vie chiuse.
        </div>

        <div class="actions">
          <div class="btn-group">
            <button @click="resetMarkers" class="btn btn-outline">Reset Punti</button>
            <button v-if="closedCount > 0" @click="resetAllClosures" class="btn btn-outline-danger">Riapri Tutto</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix icone Leaflet che a volte spariscono
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
      routeInfo: null,
      closedCount: 0,
      currentClosedIds: [] // Lista ID strade chiuse ricevuta dal server
    }
  },
  mounted() {
    this.initMap();
    this.loadMapData();
  },
  methods: {
    initMap() {
      // 1. Zoom Control ATTIVO (position: topleft)
      this.map = L.map(this.$refs.mapRef, { zoomControl: true }).setView([46.0665, 11.1216], 15);
      
      // 2. Sfondo Classico OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(this.map);

      // Inizializzazione Layer
      this.layers.streets = L.layerGroup().addTo(this.map); // Strade blu
      this.layers.route = L.layerGroup().addTo(this.map);   // Percorso verde
      this.layers.markers = L.layerGroup().addTo(this.map); // Marker A/B

      this.map.on('click', this.onMapClick);
    },

    async loadMapData() {
      try {
        const res = await fetch('/grafo_optimized.geojson');
        const data = await res.json();
        
        // Disegno le strade dal GeoJSON
        L.geoJSON(data, {
          style: (f) => this.getStreetStyle(f),
          onEachFeature: (f, layer) => {
            const p = f.properties;
            
            // Logica ID identica al server Python per coerenza
            // Preferiamo il nome (desvia) per raggruppare, altrimenti ID univoco
            const roadId = String(p.desvia || p.name || p.id || p.osm_id || Math.random());
            
            // Tooltip che mostra cosa stiamo cliccando
            layer.bindTooltip(`
              <div style="font-size:12px">
                <b>${p.desvia || p.name || 'Strada senza nome'}</b><br>
                ID Logico: ${roadId}
              </div>
            `, { sticky: true });
            
            // Tasto Destro -> Chiudi strada
            layer.on('contextmenu', (e) => {
              L.DomEvent.stopPropagation(e);
              this.toggleStreet(roadId); // Invio l'ID al server
            });
          }
        }).addTo(this.layers.streets);
      } catch (err) {
        console.error("Errore caricamento GeoJSON:", err);
      }
    },

    getStreetStyle(f) {
      const p = f.properties;
      // Deve corrispondere alla logica usata in loadMapData
      const id = String(p.desvia || p.name || p.id || p.osm_id);
      
      const isClosed = this.currentClosedIds.includes(id);
      
      return { 
        color: isClosed ? '#e74c3c' : '#3388ff', // Rosso se chiusa, Blu se aperta
        weight: isClosed ? 5 : 4, 
        opacity: isClosed ? 0.8 : 0.4, // Più trasparente se normale
        dashArray: isClosed ? '5, 10' : null 
      };
    },

    async onMapClick(e) {
      if (this.nodes.length >= 2) this.resetMarkers();
      
      this.nodes.push(e.latlng);
      
      // Marker Start (Blu) / End (Rosso)
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
        
        if (!res.ok) throw new Error("Errore server");
        
        const data = await res.json();
        if (data.path) this.drawRoute(data.path);
        
      } catch (e) { 
        alert("Impossibile calcolare il percorso (verificare server o ostacoli)."); 
      }
    },

    drawRoute(path) {
      this.layers.route.clearLayers();
      
      // Linea Verde
      const poly = L.polyline(path, {
        color: '#27ae60', weight: 7, opacity: 0.9, interactive: false
      }).addTo(this.layers.route);
      
      // Zoom sul percorso
      setTimeout(() => {
        if (this.map) this.map.fitBounds(poly.getBounds(), {padding: [50, 50]});
      }, 100);
      
      // Calcolo info
      let d = 0;
      for(let i=0; i<path.length-1; i++) d += L.latLng(path[i]).distanceTo(L.latLng(path[i+1]));
      this.routeInfo = { distance: d, time: Math.round(d/1000/30*60) || 1 };
    },

    async toggleStreet(id) {
  // 1. Invia richiesta di chiusura
  try {
    // encodeURIComponent è vitale per gestire spazi e caratteri speciali
    const res = await fetch(`http://localhost:4000/api/toggle-closure/${encodeURIComponent(id)}`, {
        method: 'POST'
    });
    
    const data = await res.json();
    
    // 2. Aggiorna lo stato visivo
    this.closedCount = data.closed_count;
    this.currentClosedIds = data.currently_closed;
    this.refreshMapStyles();
    
    console.log("Strade chiuse aggiornate:", this.currentClosedIds);

    // 3. RICALCOLO FORZATO
    // Se abbiamo già due punti (partenza e arrivo), ricalcola subito il percorso
    if (this.nodes.length === 2) {
        console.log("Ricalcolo percorso in corso...");
        await this.getRoute();
    }
  } catch (e) {
    console.error("Errore durante la chiusura:", e);
  }
},

    refreshMapStyles() {
      this.layers.streets.eachLayer(layer => {
        // Ricalcola lo stile per ogni strada
        if (layer.feature) layer.setStyle(this.getStreetStyle(layer.feature));
      });
    },

    resetMarkers() {
      this.layers.markers.clearLayers();
      this.layers.route.clearLayers();
      this.nodes = [];
      this.routeInfo = null;
    }
  }
}
</script>

<style scoped>
.map-container { position: relative; width: 100%; height: 100vh; font-family: sans-serif; }
#map { width: 100%; height: 100%; z-index: 0; background: #e0e0e0; /* Fallback colore sfondo */ }

.control-panel { 
  position: absolute; top: 10px; right: 10px; width: 300px; 
  background: white; z-index: 1000; border-radius: 8px; padding: 15px; 
  box-shadow: 0 4px 12px rgba(0,0,0,0.2); 
}
.panel-header h3 { margin: 0; color: #2c3e50; }
.subtitle { font-size: 11px; color: #7f8c8d; text-transform: uppercase; }

.stats-card { background: #e8f5e9; padding: 10px; border-radius: 6px; display: flex; justify-content: space-between; margin-top: 10px; border: 1px solid #c8e6c9;}
.warning-box { background: #fff3cd; padding: 10px; border-radius: 4px; margin-top: 10px; font-size: 13px; border: 1px solid #ffeeba;}

.stat { display: flex; flex-direction: column; }
.stat label { font-size: 9px; text-transform: uppercase; color: #2e7d32; font-weight: bold; }
.stat .value { font-weight: 800; font-size: 15px; color: #1b5e20; }

.actions { margin-top: 15px; }
.btn-group { display: flex; gap: 10px; }
.btn { flex: 1; padding: 10px; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; font-weight: 600; }
.btn-outline { background: white; }
.btn-outline:hover { background: #f5f5f5; }
.btn-outline-danger { color: #e74c3c; border-color: #e74c3c; background: white; }
.btn-outline-danger:hover { background: #fcebe9; }
</style>