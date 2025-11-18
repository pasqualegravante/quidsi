<template>
  <div id="map" ref="mapContainer" style="height: 100%; width: 100%;"></div>
</template>

<script>
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default {
  name: 'MapGraph',
  emits: ['select-node', 'select-edge'],
  data() {
    return {
      map: null,
      nodes: [],
      edges: [],
      markers: [],
      polylines: [],
      lastNodeId: null
    };
  },
  mounted() {
    this.map = L.map(this.$refs.mapContainer).setView([46.0665, 11.1216], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);
    this.map.on('click', this.addNode);
  },
  methods: {
    addNode(e) {
      const nodeId = this.nodes.length + 1;
      const node = { id: nodeId, lat: e.latlng.lat, lng: e.latlng.lng };
      this.nodes.push(node);

      const marker = L.marker([node.lat, node.lng])
        .addTo(this.map)
        .bindPopup(`Nodo ${nodeId}`)
        .on('click', () => this.$emit('select-node', node));

      this.markers.push(marker);

      if (this.lastNodeId !== null) {
        const fromNode = this.nodes.find(n => n.id === this.lastNodeId);
        const edge = { from: fromNode.id, to: node.id, length: this.calculateDistance(fromNode, node) };
        this.edges.push(edge);

        const polyline = L.polyline([[fromNode.lat, fromNode.lng], [node.lat, node.lng]], { color: 'blue' })
          .addTo(this.map)
          .on('click', () => this.$emit('select-edge', edge));

        this.polylines.push(polyline);
      }

      this.lastNodeId = nodeId;
    },
    calculateDistance(nodeA, nodeB) {
      const R = 6371000;
      const φ1 = nodeA.lat * Math.PI/180;
      const φ2 = nodeB.lat * Math.PI/180;
      const Δφ = (nodeB.lat - nodeA.lat) * Math.PI/180;
      const Δλ = (nodeB.lng - nodeA.lng) * Math.PI/180;
      const a = Math.sin(Δφ/2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
    clearSelection() {
  // Reset selezione
  this.$emit('select-node', null);
  this.$emit('select-edge', null);

  // Rimuove tutti i marker dalla mappa
  this.markers.forEach(marker => this.map.removeLayer(marker));
  this.markers = [];

  // Rimuove tutte le polilinee dalla mappa
  this.polylines.forEach(polyline => this.map.removeLayer(polyline));
  this.polylines = [];

  // Reset nodi e archi
  this.nodes = [];
  this.edges = [];
  this.lastNodeId = null;
}

  }
};
</script>

<style>
#map {
  height: 100%;
  width: 100%;
}
</style>
