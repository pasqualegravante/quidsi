<template>
  <div class="map-wrapper">
    <div id="map" ref="mapContainer"></div>
    
    <div class="controls">
      <div class="search-container">
        <div class="status-header">
          <strong>{{ statusMessage }}</strong>
        </div>
        
        <input 
          type="text" 
          v-model="searchQuery" 
          @input="searchStreet" 
          placeholder="Cerca una via..." 
          class="search-input"
        />
        
        <ul v-if="searchResults.length > 0" class="search-results">
          <li v-for="(res, index) in searchResults" :key="index" @click="selectStreet(res)">
            {{ res.displayName }} <small>({{ res.vifraz }})</small>
          </li>
        </ul>

        <div v-if="nodes.length >= 2" class="route-actions">
          <button @click="calculateBestRoute" class="btn-route">Calcola Percorso</button>
        </div>
      </div>

      <button class="btn-clear" @click="clearSelection">Pulisci Tutto</button>
      
      <div class="debug-panel">
        <label>
          <input type="checkbox" v-model="showGraphNodes" @change="toggleGraphNodes"> 
          Mostra Nodi di Rete
        </label>
      </div>
    </div>
  </div>
</template>

<script>
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Gestione della Coda di Priorità tramite Binary Heap.
 * Questa struttura dati permette di estrarre il nodo con priorità minima in tempo O(log n),
 * eliminando il lag computazionale durante l'esecuzione dell'algoritmo A*.
 */
class PriorityQueue {
  constructor() { this.heap = []; }
  
  push(node) {
    this.heap.push(node);
    let i = this.heap.length - 1;
    while (i > 0) {
      let p = Math.floor((i - 1) / 2);
      if (this.heap[p].priority <= this.heap[i].priority) break;
      [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
      i = p;
    }
  }

  pop() {
    if (this.heap.length === 0) return null;
    const top = this.heap[0];
    const bottom = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      let i = 0;
      while (true) {
        let l = i * 2 + 1, r = i * 2 + 2, s = i;
        if (l < this.heap.length && this.heap[l].priority < this.heap[s].priority) s = l;
        if (r < this.heap.length && this.heap[r].priority < this.heap[s].priority) s = r;
        if (s === i) break;
        [this.heap[i], this.heap[s]] = [this.heap[s], this.heap[i]];
        i = s;
      }
    }
    return top;
  }
  isEmpty() { return this.heap.length === 0; }
}

export default {
  name: 'MapGraph',
  data() {
    return {
      map: null,
      nodes: [],               // Coordinate dei punti di partenza e arrivo selezionati
      graph: {},               // Dizionario delle adiacenze: { "lat,lng": [{to, dist}, ...] }
      markersLayer: null,      // Layer per i marker grafici sulla mappa
      bestRouteLayer: null,    // Layer per il tracciato rosso del percorso calcolato
      debugNodesLayer: null,   // Layer per visualizzare i nodi strutturali del grafo
      geoJsonLayers: [],       // Layer delle strade originali
      searchQuery: '',
      searchResults: [],
      allStreets: [],          // Indice delle strade per la funzione di ricerca
      showGraphNodes: false,
    };
  },
  computed: {
    statusMessage() {
      if (this.nodes.length === 0) return "Seleziona Partenza";
      if (this.nodes.length === 1) return "Seleziona Arrivo";
      return "Percorso Pronto";
    }
  },
  mounted() {
    this.initMap();
    this.loadGeoJSON('/grafo_web2.geojson');
  },
  methods: {
    /** Inizializzazione della mappa e dei layer Leaflet */
    initMap() {
      this.map = L.map(this.$refs.mapContainer).setView([46.0665, 11.1216], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
      this.markersLayer = L.layerGroup().addTo(this.map);
      this.bestRouteLayer = L.layerGroup().addTo(this.map);
      this.debugNodesLayer = L.layerGroup().addTo(this.map);
      this.map.on('click', (e) => this.addNode(e));
    },

    /** Carica il GeoJSON e indicizza le strade nel grafo */
    async loadGeoJSON(url) {
      try {
        const response = await fetch(url);
        const data = await response.json();
        this.buildGraph(data);
        L.geoJSON(data, {
          style: { color: '#0000ff', weight: 3, opacity: 0.6 },
          onEachFeature: (feature, layer) => {
            const streetName = feature.properties.desvia || "Senza nome";
            this.allStreets.push({ name: streetName.toLowerCase(), displayName: streetName, layer: layer, vifraz: feature.properties.vifraz });
            layer.bindPopup(`<b>${streetName}</b>`);
          }
        }).addTo(this.map);
        this.geoJsonLayers.push(L.geoJSON(data));
      } catch (err) { console.error("Errore caricamento dati:", err); }
    },

    /** Costruzione topologica del grafo con arrotondamento per tolleranza spaziale */
    buildGraph(data) {
      this.graph = {};
      data.features.forEach(feature => {
        const coords = feature.geometry.coordinates;
        for (let i = 0; i < coords.length - 1; i++) {
          // Usiamo 4 decimali per unire nodi vicini (~11 metri) ed evitare discontinuità
          const p1 = `${coords[i][1].toFixed(4)},${coords[i][0].toFixed(4)}`;
          const p2 = `${coords[i+1][1].toFixed(4)},${coords[i+1][0].toFixed(4)}`;
          const dist = L.latLng(coords[i][1], coords[i][0]).distanceTo(L.latLng(coords[i+1][1], coords[i+1][0]));
          
          if (!this.graph[p1]) this.graph[p1] = [];
          if (!this.graph[p2]) this.graph[p2] = [];
          this.graph[p1].push({ to: p2, dist: dist });
          this.graph[p2].push({ to: p1, dist: dist });
        }
      });
    },

    /**
     * Algoritmo A* per il calcolo del percorso minimo.
     * Utilizza una mappa di distanze e una coda di priorità heap-based per l'efficienza.
     */
    calculateBestRoute() {
      if (this.nodes.length < 2) return;
      const start = this.nodes[0].graphKey;
      const end = this.nodes[1].graphKey;
      const targetLL = L.latLng(end.split(',').map(Number));

      const distances = new Map();
      const prev = new Map();
      const pq = new PriorityQueue();

      distances.set(start, 0);
      pq.push({ id: start, priority: 0 });

      while (!pq.isEmpty()) {
        const current = pq.pop().id;
        if (current === end) break; // Ottimizzazione: interruzione al raggiungimento del target

        const currentDist = distances.get(current);
        const neighbors = this.graph[current] || [];

        for (const neighbor of neighbors) {
          const newDist = currentDist + neighbor.dist;
          if (newDist < (distances.get(neighbor.to) ?? Infinity)) {
            distances.set(neighbor.to, newDist);
            prev.set(neighbor.to, current);
            
            // Euristica A*: Distanza Euclidea verso il target per guidare la ricerca
            const h = L.latLng(neighbor.to.split(',').map(Number)).distanceTo(targetLL);
            pq.push({ id: neighbor.to, priority: newDist + h });
          }
        }
      }

      // Ricostruzione del path risalendo i predecessori
      const path = [];
      let curr = end;
      while (curr) {
        path.push(curr.split(',').map(Number));
        curr = prev.get(curr);
      }

      this.bestRouteLayer.clearLayers();
      if (path.length > 1) {
        L.polyline(path, { color: 'black', weight: 8, opacity: 0.2 }).addTo(this.bestRouteLayer);
        L.polyline(path, { color: 'red', weight: 4, opacity: 1 }).addTo(this.bestRouteLayer);
        this.map.fitBounds(path, { padding: [50, 50] });
      } else {
        alert("Percorso non trovato. Controlla la connessione tra i segmenti.");
      }
    },

    /** Aggiunge un punto sulla mappa e lo inietta nel grafo stradale */
    addNode(e) {
      if (this.nodes.length >= 2) this.clearSelection();
      const result = this.findNearestOnStreet(e.latlng);
      if (!result.layer) return;

      const graphKey = `${result.point.lat.toFixed(4)},${result.point.lng.toFixed(4)}`;
      
      // Iniezione dinamica del punto cliccato nel grafo per garantire la connettività
      if (!this.graph[graphKey]) {
        const p1Key = `${result.segment[0].lat.toFixed(4)},${result.segment[0].lng.toFixed(4)}`;
        const p2Key = `${result.segment[1].lat.toFixed(4)},${result.segment[1].lng.toFixed(4)}`;
        const d1 = result.point.distanceTo(result.segment[0]);
        const d2 = result.point.distanceTo(result.segment[1]);
        this.graph[graphKey] = [{ to: p1Key, dist: d1 }, { to: p2Key, dist: d2 }];
        if (this.graph[p1Key]) this.graph[p1Key].push({ to: graphKey, dist: d1 });
        if (this.graph[p2Key]) this.graph[p2Key].push({ to: graphKey, dist: d2 });
      }

      this.nodes.push({ lat: result.point.lat, lng: result.point.lng, graphKey });
      L.circleMarker([result.point.lat, result.point.lng], { 
        radius: 8, fillColor: this.nodes.length === 1 ? 'blue' : 'red', color: 'white', weight: 2, fillOpacity: 1 
      }).addTo(this.markersLayer);
      
      this.resetGeoJsonStyle();
      result.layer.setStyle({ color: '#ff7800', weight: 5, opacity: 1 });
    },

    /** Ricerca spaziale del punto più vicino su un segmento LineString */
    findNearestOnStreet(clickedLatLng) {
      let minDistance = Infinity, nearestPoint = clickedLatLng, nearestLayer = null, nearestSegment = null;
      const clickedP = this.map.latLngToLayerPoint(clickedLatLng);
      this.geoJsonLayers[0].eachLayer(layer => {
        if (layer instanceof L.Polyline) {
          const pts = layer.getLatLngs();
          for (let i = 0; i < pts.length - 1; i++) {
            const p1 = this.map.latLngToLayerPoint(pts[i]), p2 = this.map.latLngToLayerPoint(pts[i+1]);
            const closestP = L.LineUtil.closestPointOnSegment(clickedP, p1, p2);
            const closestLL = this.map.layerPointToLatLng(closestP);
            const d = clickedLatLng.distanceTo(closestLL);
            if (d < minDistance) {
              minDistance = d; nearestPoint = closestLL; nearestLayer = layer; nearestSegment = [pts[i], pts[i+1]];
            }
          }
        }
      });
      return { point: nearestPoint, layer: nearestLayer, segment: nearestSegment };
    },

    toggleGraphNodes() {
      this.debugNodesLayer.clearLayers();
      if (this.showGraphNodes) {
        Object.keys(this.graph).forEach(k => {
          L.circleMarker(k.split(',').map(Number), { radius: 1, color: 'black' }).addTo(this.debugNodesLayer);
        });
      }
    },
    clearSelection() {
      this.markersLayer.clearLayers();
      this.bestRouteLayer.clearLayers();
      this.nodes = [];
      this.resetGeoJsonStyle();
    },
    resetGeoJsonStyle() { this.geoJsonLayers[0].setStyle({ color: '#0000ff', weight: 3, opacity: 0.6 }); },
    searchStreet() {
      if (this.searchQuery.length < 2) return this.searchResults = [];
      this.searchResults = this.allStreets.filter(s => s.name.includes(this.searchQuery.toLowerCase())).slice(0, 5);
    },
    selectStreet(res) {
      this.resetGeoJsonStyle();
      this.map.setView(res.layer.getBounds().getCenter(), 17);
      res.layer.setStyle({ color: '#ff7800', weight: 5, opacity: 1 });
      this.searchQuery = ''; this.searchResults = [];
    }
  }
};
</script>

<style scoped>
.map-wrapper { position: relative; width: 100%; height: 100vh; }
#map { height: 100%; width: 100%; cursor: crosshair; }
.controls { position: absolute; top: 10px; right: 10px; z-index: 1000; width: 280px; display: flex; flex-direction: column; gap: 10px; }
.search-container { background: white; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-shadow: 2px 2px 10px rgba(0,0,0,0.2); }
.status-header { margin-bottom: 8px; font-size: 14px; color: #333; }
.search-input { width: 100%; padding: 8px; border: 1px solid #ddd; box-sizing: border-box; }
.search-results { list-style: none; padding: 0; margin: 10px 0 0 0; border-top: 1px solid #eee; }
.search-results li { padding: 8px; cursor: pointer; border-bottom: 1px solid #eee; font-size: 13px; }
.search-results li:hover { background: #f0f0f0; }
.btn-route { width: 100%; background: #28a745; color: white; border: none; padding: 10px; margin-top: 10px; cursor: pointer; font-weight: bold; }
.btn-clear { background: #dc3545; color: white; border: none; padding: 10px; cursor: pointer; font-weight: bold; border-radius: 4px; }
.debug-panel { background: white; padding: 8px; font-size: 11px; border: 1px solid #ccc; }
</style>