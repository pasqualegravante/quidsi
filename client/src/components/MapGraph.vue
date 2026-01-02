<template>
  <div class="map-container">
    <div id="map" ref="mapRef" @contextmenu.prevent></div>
    
    <div class="control-panel">
      <div class="panel-header">
        <h3>QuidSI</h3>
        <span class="subtitle">Simulazione & Routing</span>
      </div>

      <div class="panel-body">
        <div class="info-box">
          <div class="info-row">
            <span class="key-badge">SX</span>
            <span>Navigazione (Partenza/Arrivo)</span>
          </div>
          <div class="info-row">
            <span class="key-badge">DX</span>
            <span>Chiudi/Apri strada (Simulazione)</span>
          </div>
        </div>

        <div v-if="routeInfo" class="stats-card">
          <div class="stat">
            <label>Distanza</label>
            <span class="value">{{ (routeInfo.distance / 1000).toFixed(2) }} km</span>
          </div>
          <div class="stat">
            <label>Tempo stimato</label>
            <span class="value">{{ routeInfo.time }} min</span>
          </div>
        </div>

        <div v-if="closedStreets.size > 0" class="warning-box">
          <strong>Attenzione:</strong> {{ closedStreets.size }} tratti stradali chiusi.
        </div>

        <div class="actions">
          <button 
            v-if="nodes.length >= 2" 
            @click="calculateBestRoute" 
            class="btn btn-primary"
          >
            Aggiorna Percorso
          </button>
          
          <div class="btn-group">
            <button @click="resetMap" class="btn btn-outline">Reset</button>
            <button 
              v-if="closedStreets.size > 0" 
              @click="resetClosures" 
              class="btn btn-outline-danger"
            >
              Riapri Tutto
            </button>
          </div>
        </div>
      </div>
      
      <div class="panel-footer">
        <label class="checkbox-label">
          <input type="checkbox" v-model="showGraphNodes" @change="toggleGraphNodes">
          Mostra nodi grafo
        </label>
      </div>
    </div>
  </div>
</template>

<script>
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * PriorityQueue implementation for A* Algorithm.
 * Uses a binary heap for O(log n) performance on insertions and removals.
 */
class MinHeap {
  constructor() { this.heap = []; }
  
  push(node) {
    this.heap.push(node);
    this.bubbleUp();
  }
  
  pop() {
    if (this.heap.length === 0) return null;
    const top = this.heap[0];
    const bottom = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this.bubbleDown();
    }
    return top;
  }
  
  bubbleUp() {
    let i = this.heap.length - 1;
    while (i > 0) {
      let p = Math.floor((i - 1) / 2);
      if (this.heap[p].priority <= this.heap[i].priority) break;
      [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
      i = p;
    }
  }
  
  bubbleDown() {
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
  
  isEmpty() { return this.heap.length === 0; }
}

export default {
  name: 'MapGraph',
  data() {
    return {
      map: null,
      
      // Data structures
      nodes: [],               // Selected start/end points
      graph: {},               // Adjacency list for the routing graph
      allStreetsIndex: [],     // Spatial index for fast lookups
      
      // Leaflet Layers
      layers: {
        streets: null,
        route: null,
        markers: null,
        debug: null
      },

      // State
      closedStreets: new Set(), // Set of IDs (Strings)
      routeInfo: null,
      showGraphNodes: false
    };
  },
  mounted() {
    this.initMap();
    this.fetchData();
  },
  beforeUnmount() {
    if (this.map) {
      this.map.off();
      this.map.remove();
    }
  },
  methods: {
    // --- MAP INITIALIZATION ---
    initMap() {
      // Disable default zoom control to move it to top-left
      this.map = L.map(this.$refs.mapRef, { zoomControl: false }).setView([46.0665, 11.1216], 15);
      
      L.control.zoom({ position: 'topleft' }).addTo(this.map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(this.map);

      // Initialize layer groups strictly ordered by z-index
      this.layers.streets = L.layerGroup().addTo(this.map);
      this.layers.route = L.layerGroup().addTo(this.map);
      this.layers.debug = L.layerGroup().addTo(this.map);
      this.layers.markers = L.layerGroup().addTo(this.map);

      // Global map click handler
      this.map.on('click', this.handleMapClick);
    },

    // --- DATA LOADING ---
    async fetchData() {
      try {
        const res = await fetch('/grafo_web2.geojson');
        if (!res.ok) throw new Error('Failed to load GeoJSON');
        const data = await res.json();
        
        this.buildGraph(data);
        this.renderStreets(data);
        
      } catch (err) {
        console.error('Data loading error:', err);
        alert('Errore nel caricamento della rete stradale.');
      }
    },

    renderStreets(data) {
      const geoLayer = L.geoJSON(data, {
        style: (feature) => this.getStyle(feature),
        onEachFeature: (feature, layer) => {
          // Push to index for spatial search
          this.allStreetsIndex.push({ layer, feature });

          // Basic tooltip
          layer.bindTooltip(feature.properties.desvia || 'Strada', { 
            sticky: true, direction: 'top' 
          });

          // Event Listeners
          layer.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            this.handleMapClick(e); // Pass click to logic handler
          });

          layer.on('contextmenu', (e) => {
            L.DomEvent.stopPropagation(e);
            this.toggleClosure(String(feature.properties.codice));
          });
        }
      });
      
      this.layers.streets.addLayer(geoLayer);
    },

    // --- CORE LOGIC ---
    
    handleMapClick(e) {
      if (this.nodes.length >= 2) this.resetMap();

      const match = this.getNearestStreet(e.latlng);
      if (!match) return; // Clicked too far from any road

      const { point, segment, properties } = match;
      const key = `${point.lat.toFixed(4)},${point.lng.toFixed(4)}`;
      const roadId = String(properties.codice);

      // Dynamic graph injection: split the edge if this is a new node
      if (!this.graph[key]) {
        this.injectNodeIntoGraph(key, point, segment, roadId);
      }

      this.nodes.push({ lat: point.lat, lng: point.lng, graphKey: key });
      this.addMarker(point, this.nodes.length === 1 ? 'start' : 'end');

      if (this.nodes.length === 2) {
        this.calculateRoute();
      }
    },

    injectNodeIntoGraph(key, point, segment, roadId) {
      const [pA, pB] = segment;
      // Create keys for existing segment endpoints
      const keyA = `${pA.lat.toFixed(4)},${pA.lng.toFixed(4)}`;
      const keyB = `${pB.lat.toFixed(4)},${pB.lng.toFixed(4)}`;
      
      const distA = point.distanceTo(pA);
      const distB = point.distanceTo(pB);

      // Create bidirectional connections
      this.graph[key] = [
        { to: keyA, dist: distA, roadId },
        { to: keyB, dist: distB, roadId }
      ];
      
      // Link existing nodes to new split node
      if (this.graph[keyA]) this.graph[keyA].push({ to: key, dist: distA, roadId });
      if (this.graph[keyB]) this.graph[keyB].push({ to: key, dist: distB, roadId });
    },

    getNearestStreet(latlng) {
      let bestMatch = null;
      let minDistance = Infinity;
      const p = this.map.latLngToLayerPoint(latlng);

      // Search optimization: iterate raw layers for geometric calculation
      this.allStreetsIndex.forEach(item => {
        const layer = item.layer;
        // Handle both simple Polylines and MultiPolylines
        const polyline = (layer instanceof L.Polyline) ? layer : (layer.getLayers ? layer.getLayers()[0] : null);
        
        if (polyline) {
          const pts = polyline.getLatLngs();
          for (let i = 0; i < pts.length - 1; i++) {
            const p1 = this.map.latLngToLayerPoint(pts[i]);
            const p2 = this.map.latLngToLayerPoint(pts[i+1]);
            
            const closestPoint = L.LineUtil.closestPointOnSegment(p, p1, p2);
            const closestLatLng = this.map.layerPointToLatLng(closestPoint);
            const dist = latlng.distanceTo(closestLatLng);

            // 30 meters tolerance
            if (dist < minDistance && dist < 30) {
              minDistance = dist;
              bestMatch = {
                point: closestLatLng,
                segment: [pts[i], pts[i+1]],
                properties: item.feature.properties
              };
            }
          }
        }
      });
      return bestMatch;
    },

    // --- DSS & GRAPH MANAGEMENT ---

    buildGraph(data) {
      this.graph = {};
      data.features.forEach(f => {
        const coords = f.geometry.coordinates;
        // Crucial: Ensure IDs are strings to avoid type mismatch later
        const id = String(f.properties.codice);

        for (let i = 0; i < coords.length - 1; i++) {
          // Precision fix: round to 4 decimals to ensure connectivity
          const p1 = `${coords[i][1].toFixed(4)},${coords[i][0].toFixed(4)}`;
          const p2 = `${coords[i+1][1].toFixed(4)},${coords[i+1][0].toFixed(4)}`;
          const dist = L.latLng(coords[i][1], coords[i][0]).distanceTo(L.latLng(coords[i+1][1], coords[i+1][0]));

          if (!this.graph[p1]) this.graph[p1] = [];
          if (!this.graph[p2]) this.graph[p2] = [];

          this.graph[p1].push({ to: p2, dist, roadId: id });
          this.graph[p2].push({ to: p1, dist, roadId: id });
        }
      });
    },

    toggleClosure(id) {
      if (this.closedStreets.has(id)) {
        this.closedStreets.delete(id);
      } else {
        this.closedStreets.add(id);
      }
      this.updateLayerStyles();
      
      // Auto-recalculate if a route exists
      if (this.nodes.length >= 2) this.calculateRoute();
    },

    updateLayerStyles() {
      this.layers.streets.eachLayer(layer => {
        layer.eachLayer(l => {
          if (l.feature) l.setStyle(this.getStyle(l.feature));
        });
      });
    },

    getStyle(feature) {
      const id = String(feature.properties.codice);
      if (this.closedStreets.has(id)) {
        return { color: '#e74c3c', weight: 4, opacity: 0.8, dashArray: '10, 10' }; // Red dashed
      }
      return { color: '#3388ff', weight: 4, opacity: 0.6 }; // Default Blue
    },

    // --- ROUTING ALGORITHM (A*) ---

    calculateRoute() {
      const start = this.nodes[0].graphKey;
      const end = this.nodes[1].graphKey;
      const targetLL = L.latLng(end.split(',').map(Number));

      const distances = new Map();
      const prev = new Map();
      const pq = new MinHeap();

      distances.set(start, 0);
      pq.push({ id: start, priority: 0 });

      while (!pq.isEmpty()) {
        const current = pq.pop().id;
        if (current === end) break;

        const neighbors = this.graph[current] || [];
        for (const neighbor of neighbors) {
          // DSS Check: Skip if road is closed
          if (this.closedStreets.has(String(neighbor.roadId))) continue;

          const newDist = distances.get(current) + neighbor.dist;
          if (newDist < (distances.get(neighbor.to) ?? Infinity)) {
            distances.set(neighbor.to, newDist);
            prev.set(neighbor.to, current);
            
            // Heuristic: Euclidean distance to target
            const h = L.latLng(neighbor.to.split(',').map(Number)).distanceTo(targetLL);
            pq.push({ id: neighbor.to, priority: newDist + h });
          }
        }
      }

      this.drawRoute(prev, end);
    },

    drawRoute(prev, end) {
      this.layers.route.clearLayers();
      const path = [];
      let curr = end;
      let totalDist = 0;

      // Backtrack path
      if (prev.has(end)) {
        while (curr) {
          const pt = curr.split(',').map(Number);
          path.push(pt);
          const parent = prev.get(curr);
          if (parent) {
            totalDist += L.latLng(pt).distanceTo(L.latLng(parent.split(',').map(Number)));
          }
          curr = parent;
        }
      }

      if (path.length === 0) {
        alert("Nessun percorso trovato. Verificare le chiusure stradali.");
        return;
      }

      this.routeInfo = { 
        distance: totalDist, 
        time: Math.round((totalDist / 1000) / 30 * 60) || 1 // Approx 30km/h avg speed
      };

      L.polyline(path, { color: '#27ae60', weight: 6, opacity: 0.9 }).addTo(this.layers.route);
      this.map.fitBounds(path, { padding: [50, 50] });
    },

    // --- UI HELPERS ---

    addMarker(latlng, type) {
      const color = type === 'start' ? '#2980b9' : '#c0392b';
      L.circleMarker(latlng, {
        radius: 8,
        fillColor: color,
        color: '#fff',
        weight: 2,
        fillOpacity: 1
      }).addTo(this.layers.markers);
    },

    resetMap() {
      this.layers.markers.clearLayers();
      this.layers.route.clearLayers();
      this.nodes = [];
      this.routeInfo = null;
    },

    resetClosures() {
      this.closedStreets.clear();
      this.updateLayerStyles();
      if (this.nodes.length >= 2) this.calculateRoute();
    },

    toggleGraphNodes() {
      this.layers.debug.clearLayers();
      if (this.showGraphNodes) {
        Object.keys(this.graph).forEach(k => {
          L.circleMarker(k.split(',').map(Number), { radius: 1, color: '#333' }).addTo(this.layers.debug);
        });
      }
    }
  }
};
</script>

<style scoped>
/* Main Container */
.map-container {
  position: relative;
  width: 100%;
  height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

#map {
  width: 100%;
  height: 100%;
  z-index: 0;
}

/* Control Panel - Floating Style */
.control-panel {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 300px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header */
.panel-header {
  padding: 15px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  color: #2c3e50;
}

.subtitle {
  font-size: 12px;
  color: #7f8c8d;
}

/* Body */
.panel-body {
  padding: 15px;
}

/* Info Legend */
.info-box {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
  font-size: 12px;
  color: #555;
  background: #f8f9fa;
  padding: 8px;
  border-radius: 4px;
}

.key-badge {
  display: inline-block;
  padding: 2px 6px;
  background: #e9ecef;
  border: 1px solid #ced4da;
  border-radius: 3px;
  font-weight: bold;
  font-size: 10px;
  margin-right: 5px;
}

/* Stats */
.stats-card {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
  padding: 10px;
  background: #e8f5e9;
  border: 1px solid #c8e6c9;
  border-radius: 6px;
}

.stat {
  display: flex;
  flex-direction: column;
}

.stat label {
  font-size: 10px;
  text-transform: uppercase;
  color: #2e7d32;
}

.stat .value {
  font-weight: bold;
  font-size: 14px;
  color: #1b5e20;
}

/* Alerts */
.warning-box {
  background: #fff3cd;
  color: #856404;
  padding: 10px;
  border-radius: 4px;
  font-size: 13px;
  margin-bottom: 15px;
  border: 1px solid #ffeeba;
}

/* Buttons */
.actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn-group {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 10px;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  flex: 1;
  font-size: 13px;
  transition: background 0.2s;
}

.btn-primary { background: #3498db; color: white; }
.btn-primary:hover { background: #2980b9; }

.btn-outline { background: white; border: 1px solid #ccc; color: #333; }
.btn-outline:hover { background: #f1f1f1; }

.btn-outline-danger { background: white; border: 1px solid #e74c3c; color: #e74c3c; }
.btn-outline-danger:hover { background: #fcebe9; }

/* Footer */
.panel-footer {
  padding: 10px 15px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
  font-size: 12px;
  color: #666;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}
</style>