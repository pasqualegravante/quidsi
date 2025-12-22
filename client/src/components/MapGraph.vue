<template>
  <div class="map-wrapper">
    <div id="map" ref="mapContainer"></div>
    <div class="controls">
      <button @click="clearSelection">Pulisci Mappa</button>
    </div>
  </div>
</template>

<script>
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix icone Leaflet in Vue/Vite/Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default {
  name: 'MapGraph',
  emits: ['select-node', 'select-edge'],
  data() {
    return {
      map: null,
      nodes: [],
      edges: [],
      markersLayer: null,
      polylinesLayer: null,
      geoJsonLayers: [],
      lastNodeId: null,
    };
  },
  mounted() {
    this.initMap();
    this.loadGeoJSON('/grafo_web2.geojson');
  },
  methods: {
    initMap() {
      this.map = L.map(this.$refs.mapContainer).setView([46.0665, 11.1216], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(this.map);

      // LayerGroup per nodi e polilinee
      this.markersLayer = L.layerGroup().addTo(this.map);
      this.polylinesLayer = L.layerGroup().addTo(this.map);

      // Click sulla mappa per aggiungere nodi
      this.map.on('click', this.addNode);
    },
    async loadGeoJSON(url = '/grafo_web2.geojson') {
      try {
        const response = await fetch(url);
        const data = await response.json();
        const geoLayer = L.geoJSON(data, {
          style: { color: '#ff7800', weight: 5, opacity: 0.65 },
          onEachFeature: (feature, layer) => {
            if (feature.properties) {
              const popupContent = Object.entries(feature.properties)
                .map(([k, v]) => `<b>${k}:</b> ${v}`)
                .join('<br>');
              layer.bindPopup(popupContent);
            }
          }
        }).addTo(this.map);

        this.geoJsonLayers.push(geoLayer);

        const bounds = geoLayer.getBounds();
        if (bounds.isValid()) this.map.fitBounds(bounds);
      } catch (err) {
        console.error('Errore GeoJSON:', err);
      }
    },
    addNode(e) {
      const nodeId = this.nodes.length + 1;
      const node = { id: nodeId, lat: e.latlng.lat, lng: e.latlng.lng };
      this.nodes.push(node);

      const marker = L.marker([node.lat, node.lng])
        .addTo(this.markersLayer)
        .bindPopup(`Nodo ${nodeId}`)
        .on('click', (event) => {
          L.DomEvent.stopPropagation(event);
          this.$emit('select-node', node);
        });

      if (this.lastNodeId !== null) {
        const fromNode = this.nodes.find(n => n.id === this.lastNodeId);
        const edge = {
          from: fromNode.id,
          to: node.id,
          length: this.calculateDistance(fromNode, node),
        };
        this.edges.push(edge);

        const polyline = L.polyline(
          [[fromNode.lat, fromNode.lng], [node.lat, node.lng]],
          { color: 'blue', weight: 4 }
        )
        .addTo(this.polylinesLayer)
        .bindPopup(`Distanza: ${edge.length.toFixed(1)} m`)
        .on('click', (event) => {
          L.DomEvent.stopPropagation(event);
          this.$emit('select-edge', edge);
        });
      }

      this.lastNodeId = nodeId;
    },
    calculateDistance(nodeA, nodeB) {
      const R = 6371000; // raggio terrestre in metri
      const rad = Math.PI / 180;
      const φ1 = nodeA.lat * rad;
      const φ2 = nodeB.lat * rad;
      const Δφ = (nodeB.lat - nodeA.lat) * rad;
      const Δλ = (nodeB.lng - nodeA.lng) * rad;
      const a = Math.sin(Δφ / 2) ** 2 +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
    clearSelection() {
      this.$emit('select-node', null);
      this.$emit('select-edge', null);

      this.markersLayer.clearLayers();
      this.polylinesLayer.clearLayers();
      this.geoJsonLayers.forEach(l => this.map.removeLayer(l));
      this.geoJsonLayers = [];

      this.nodes = [];
      this.edges = [];
      this.lastNodeId = null;
    },
  },
};
</script>

<style scoped>
.map-wrapper {
  position: relative;
  width: 100%;
  height: 500px;
}
#map {
  height: 100%;
  width: 100%;
  z-index: 1;
}
.controls {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
  background: white;
  padding: 10px;
  border-radius: 4px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}
button {
  cursor: pointer;
  padding: 5px 10px;
}
</style>
