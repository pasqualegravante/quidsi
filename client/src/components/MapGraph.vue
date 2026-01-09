<template>
  <div class="map-container">
    <div id="map" ref="mapRef" @contextmenu.prevent></div>

    <div class="control-panel">
      <div class="panel-header">
        <h3>QuidSI</h3>
        <span class="subtitle">Decision Support System - Traffico</span>
      </div>

      <div class="panel-body">
        <div class="info-box">
          <div class="info-row">
            <span class="key-badge sx">SX</span>
            <span>Navigazione (Partenza/Arrivo)</span>
          </div>
          <div class="info-row">
            <span class="key-badge dx">DX</span>
            <span>Chiudi/Apri intera via (Simulazione)</span>
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
          <span class="icon">🚧</span>
          <strong>{{ closedStreets.size }}</strong> strade chiuse al traffico.
        </div>

        <div class="actions">
          <button v-if="nodes.length >= 2" @click="calculateRoute" class="btn btn-primary">
            Aggiorna Percorso
          </button>

          <div class="btn-group">
            <button @click="resetMap" class="btn btn-outline">Reset Punti</button>
            <button v-if="closedStreets.size > 0" @click="resetClosures" class="btn btn-outline-danger">
              Riapri Tutto
            </button>
          </div>
        </div>
      </div>

      <div class="panel-footer">
        <label class="checkbox-label">
          <input type="checkbox" v-model="showGraphNodes" @change="toggleGraphNodes">
          Mostra nodi di rete
        </label>
      </div>
    </div>
  </div>
</template>

<script>
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

class MinHeap {
  constructor() { this.heap = []; }
  push(node) { this.heap.push(node); this.bubbleUp(); }
  pop() {
    if (this.heap.length === 0) return null;
    const top = this.heap[0];
    const bottom = this.heap.pop();
    if (this.heap.length > 0) { this.heap[0] = bottom; this.bubbleDown(); }
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
      nodes: [],
      graph: {},
      allStreetsIndex: [],
      layers: { streets: null, route: null, markers: null, debug: null },
      closedStreets: new Set(),
      routeInfo: null,
      showGraphNodes: false
    };
  },
  mounted() {
    this.initMap();
    this.fetchData();
  },
  methods: {
    initMap() {
      this.map = L.map(this.$refs.mapRef, { zoomControl: false }).setView([46.0665, 11.1216], 15);
      L.control.zoom({ position: 'topleft' }).addTo(this.map);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

      this.layers.streets = L.layerGroup().addTo(this.map);
      this.layers.route = L.layerGroup().addTo(this.map);
      this.layers.debug = L.layerGroup().addTo(this.map);
      this.layers.markers = L.layerGroup().addTo(this.map);

      this.map.on('click', this.handleMapClick);
    },

    async fetchData() {
      try {
        const res = await fetch('/grafo_optimized.geojson');
        const data = await res.json();
        this.buildGraph(data);
        this.renderStreets(data);
      } catch (err) { console.error(err); }
    },

    buildGraph(data) {
      this.graph = {};
      data.features.forEach(f => {
        const coords = f.geometry.coordinates;
        const p = f.properties;
        const roadGroupId = String(p.ref_id || p.codice || p.id);
        const speedFactor = (p.speed || 30) / 3.6;
        const isOneWay = String(p.oneway || p.sensouni) === '1';

        for (let i = 0; i < coords.length - 1; i++) {
          const k1 = `${coords[i][1].toFixed(4)},${coords[i][0].toFixed(4)}`;
          const k2 = `${coords[i + 1][1].toFixed(4)},${coords[i + 1][0].toFixed(4)}`;
          const d = L.latLng(coords[i][1], coords[i][0]).distanceTo(L.latLng(coords[i + 1][1], coords[i + 1][0]));
          const timeCost = d / speedFactor;

          if (!this.graph[k1]) this.graph[k1] = [];
          if (!this.graph[k2]) this.graph[k2] = [];

          this.graph[k1].push({ to: k2, dist: d, cost: timeCost, roadId: roadGroupId });
          if (!isOneWay) {
            this.graph[k2].push({ to: k1, dist: d, cost: timeCost, roadId: roadGroupId });
          }
        }
      });
    },

    renderStreets(data) {
      const geoLayer = L.geoJSON(data, {
        style: (f) => this.getStyle(f),
        onEachFeature: (f, layer) => {
          this.allStreetsIndex.push({ layer, feature: f });

          const props = f.properties;
          let tooltipHtml = `<div style="padding: 5px; min-width: 150px;">`;
          tooltipHtml += `<strong style="font-size: 14px;">${props.name || props.desvia || 'Strada'}</strong><hr style="margin: 5px 0;">`;
          for (let key in props) {
            if (['id', 'ref_id', 'codice', 'speed', 'oneway', 'vifraz', 'tipo_arco'].includes(key)) {
              tooltipHtml += `<span style="font-size: 11px;"><b>${key}:</b> ${props[key]}</span><br>`;
            }
          }
          tooltipHtml += `</div>`;
          layer.bindTooltip(tooltipHtml, { sticky: true, direction: 'top' });

          layer.on('click', (e) => { L.DomEvent.stopPropagation(e); this.handleMapClick(e); });
          layer.on('contextmenu', (e) => {
            L.DomEvent.stopPropagation(e);
            const groupId = String(f.properties.ref_id || f.properties.codice || f.properties.id);
            this.toggleClosure(groupId);
          });
        }
      });
      this.layers.streets.addLayer(geoLayer);
    },

    getStyle(feature) {
      const id = String(feature.properties.ref_id || feature.properties.codice || feature.properties.id);
      const isClosed = this.closedStreets.has(id);
      return { color: isClosed ? '#e74c3c' : '#3388ff', weight: 4, opacity: isClosed ? 0.8 : 0.6, dashArray: isClosed ? '10, 10' : null };
    },

    toggleClosure(id) {
      if (this.closedStreets.has(id)) this.closedStreets.delete(id);
      else this.closedStreets.add(id);
      this.layers.streets.eachLayer(group => group.eachLayer(l => l.setStyle(this.getStyle(l.feature))));
      if (this.nodes.length >= 2) this.calculateRoute();
    },

    handleMapClick(e) {
      if (this.nodes.length >= 2) this.resetMap();
      const match = this.getNearestStreet(e.latlng);
      if (!match) return;

      const { point, segment, properties } = match;
      const key = `${point.lat.toFixed(4)},${point.lng.toFixed(4)}`;
      const roadGroupId = String(properties.ref_id || properties.codice || properties.id);

      if (!this.graph[key]) {
        const isOneWay = String(properties.oneway || properties.sensouni) === '1';
        this.injectNodeIntoGraph(key, point, segment, roadGroupId, properties.speed, isOneWay);
      }

      this.nodes.push({ lat: point.lat, lng: point.lng, graphKey: key });
      this.addMarker(point, this.nodes.length === 1 ? 'start' : 'end');
      if (this.nodes.length === 2) this.calculateRoute();
    },

    injectNodeIntoGraph(key, point, segment, roadGroupId, speedKmh, isOneWay) {
      const [pA, pB] = segment;
      const keyA = `${pA.lat.toFixed(4)},${pA.lng.toFixed(4)}`;
      const keyB = `${pB.lat.toFixed(4)},${pB.lng.toFixed(4)}`;
      const distA = point.distanceTo(pA);
      const distB = point.distanceTo(pB);
      const speedMs = (speedKmh || 30) / 3.6;
      const costA = distA / speedMs;
      const costB = distB / speedMs;

      this.graph[key] = [{ to: keyB, dist: distB, cost: costB, roadId: roadGroupId }];
      if (!isOneWay) this.graph[key].push({ to: keyA, dist: distA, cost: costA, roadId: roadGroupId });
      if (this.graph[keyA]) this.graph[keyA].push({ to: key, dist: distA, cost: costA, roadId: roadGroupId });
      if (!isOneWay && this.graph[keyB]) this.graph[keyB].push({ to: key, dist: distB, cost: costB, roadId: roadGroupId });
    },

    getNearestStreet(latlng) {
      let bestMatch = null; let minDistance = Infinity;
      const p = this.map.latLngToLayerPoint(latlng);
      this.allStreetsIndex.forEach(item => {
        const poly = (item.layer instanceof L.Polyline) ? item.layer : (item.layer.getLayers ? item.layer.getLayers()[0] : null);
        if (poly) {
          const pts = poly.getLatLngs();
          for (let i = 0; i < pts.length - 1; i++) {
            const p1 = this.map.latLngToLayerPoint(pts[i]);
            const p2 = this.map.latLngToLayerPoint(pts[i + 1]);
            const closest = L.LineUtil.closestPointOnSegment(p, p1, p2);
            const cLL = this.map.layerPointToLatLng(closest);
            const d = latlng.distanceTo(cLL);
            if (d < minDistance && d < 30) { minDistance = d; bestMatch = { point: cLL, segment: [pts[i], pts[i + 1]], properties: item.feature.properties }; }
          }
        }
      });
      return bestMatch;
    },

    calculateRoute() {
      const start = this.nodes[0].graphKey;
      const end = this.nodes[1].graphKey;
      const targetLL = L.latLng(end.split(',').map(Number));
      const gScore = new Map(); const prev = new Map(); const pq = new MinHeap();
      gScore.set(start, 0); pq.push({ id: start, priority: 0 });

      while (!pq.isEmpty()) {
        const current = pq.pop().id;
        if (current === end) break;
        (this.graph[current] || []).forEach(neighbor => {
          if (this.closedStreets.has(String(neighbor.roadId))) return;
          const tentG = gScore.get(current) + neighbor.cost;
          if (tentG < (gScore.get(neighbor.to) ?? Infinity)) {
            gScore.set(neighbor.to, tentG); prev.set(neighbor.to, current);
            const h = L.latLng(neighbor.to.split(',').map(Number)).distanceTo(targetLL) / (70 / 3.6);
            pq.push({ id: neighbor.to, priority: tentG + h });
          }
        });
      }
      this.drawRoute(prev, end);
    },

    drawRoute(prev, end) {
      this.layers.route.clearLayers();
      const path = []; let curr = end; let totalDist = 0;
      if (prev.has(end) || end === this.nodes[0].graphKey) {
        while (curr) {
          path.push(curr.split(',').map(Number));
          const parent = prev.get(curr);
          if (parent) totalDist += L.latLng(curr.split(',').map(Number)).distanceTo(L.latLng(parent.split(',').map(Number)));
          curr = parent;
        }
      }
      if (path.length < 2) { alert("Percorso non trovato!"); return; }
      this.routeInfo = { distance: totalDist, time: Math.round(totalDist / 1000 / 30 * 60) || 1 };
      L.polyline(path, { color: '#27ae60', weight: 6, opacity: 0.9, interactive: false }).addTo(this.layers.route);
      this.map.fitBounds(path, { padding: [50, 50] });
    },

    addMarker(latlng, type) {
      const color = type === 'start' ? '#2980b9' : '#c0392b';
      L.circleMarker(latlng, { radius: 8, fillColor: color, color: '#fff', weight: 2, fillOpacity: 1 }).addTo(this.layers.markers);
    },

    resetMap() { this.layers.markers.clearLayers(); this.layers.route.clearLayers(); this.nodes = []; this.routeInfo = null; },
    resetClosures() { this.closedStreets.clear(); this.layers.streets.eachLayer(g => g.eachLayer(l => l.setStyle(this.getStyle(l.feature)))); if (this.nodes.length >= 2) this.calculateRoute(); },
    toggleGraphNodes() {
      this.layers.debug.clearLayers();
      if (this.showGraphNodes) {
        Object.keys(this.graph).forEach(k => { L.circleMarker(k.split(',').map(Number), { radius: 1, color: '#333' }).addTo(this.layers.debug); });
      }
    }
  }
};
</script>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  height: 100vh;
  font-family: sans-serif;
}

#map {
  width: 100%;
  height: 100%;
  z-index: 0;
}

path.leaflet-interactive:focus {
  outline: none;
}

.control-panel {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 300px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
}

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

.panel-body {
  padding: 15px;
}

.info-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 15px;
  font-size: 12px;
  background: #f8f9fa;
  padding: 8px;
  border-radius: 4px;
}

.info-row {
  display: flex;
  align-items: center;
}

.key-badge {
  display: inline-block;
  padding: 2px 6px;
  background: #e9ecef;
  border: 1px solid #ced4da;
  border-radius: 3px;
  font-weight: bold;
  font-size: 10px;
  margin-right: 8px;
  min-width: 24px;
  text-align: center;
}

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

.warning-box {
  background: #fff3cd;
  color: #856404;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  margin-bottom: 15px;
  border: 1px solid #ffeeba;
  display: flex;
  align-items: center;
  gap: 6px;
}

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
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-outline {
  background: white;
  border: 1px solid #ccc;
  color: #333;
}

.btn-outline-danger {
  background: white;
  border: 1px solid #e74c3c;
  color: #e74c3c;
}

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