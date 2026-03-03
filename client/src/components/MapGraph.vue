<template>
  <div class="map-wrapper">
    <div id="map" ref="mapContainer"></div>
    <div v-if="loading" class="map-loader">Sincronizzazione Grafo...</div>
  </div>
</template>

<script>
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import proj4 from 'proj4';
import { markRaw } from 'vue';
import { useDssStore } from '../store/dssStore'; 

const UTM_32N = "+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs";
const WGS84 = "EPSG:4326";
const TRENTO_BOUNDS = [[45.9500, 11.0000], [46.1500, 11.2500]];

export default {
  name: 'MapGraph',
  props: { closedEdges: Array, focusEdgeId: String },
  emits: ['select-edge'],

  setup() { 
    const dssStore = useDssStore(); 
    return { dssStore }; 
  },

  created() {
    this.uidIndex = {};   
    this.groupIndex = {}; 
  },

  data() {
    return { map: null, graphLayer: null, poiLayer: null, loading: false, lastSelectedUids: [] };
  },

  watch: {
    closedEdges: { handler(newIds) { this.syncClosures(newIds); }, deep: true },
    'dssStore.connectedComponents': { handler(newCCs) { this.renderConnectedComponents(newCCs); }, deep: true },
    'dssStore.dijkstraPath': { handler(newPath) { this.syncRoutePath(newPath); }, deep: true },
    focusEdgeId(newId) { if (newId) this.zoomToEdgeGroup(newId); }
  },

  mounted() { 
    this.initMap(); 
    this.loadGraph(); 
  },

  methods: {
    initMap() {
      this.map = markRaw(L.map(this.$refs.mapContainer, {
        zoomControl: false, preferCanvas: true, maxBounds: TRENTO_BOUNDS, minZoom: 12
      }).setView([46.0665, 11.1216], 15));

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(this.map);
      this.poiLayer = markRaw(L.layerGroup()).addTo(this.map); 
      L.control.zoom({ position: 'topleft' }).addTo(this.map);
      
      this.map.on('click', () => { this.clearHighlight(); });
    },

    renderPOI() {
      if (!this.poiLayer) return;
      this.poiLayer.clearLayers();
      const icons = { school: '🏫', hospital: '🏥', fire: '🚒' };
      const list = this.dssStore.poiList || [];
      list.forEach(poi => {
        const customIcon = L.divIcon({ html: `<div style="font-size:20px;">${icons[poi.type] || '📍'}</div>`, className: 'poi-marker', iconSize: [25, 25]});
        L.marker([poi.lat, poi.lng], { icon: customIcon }).addTo(this.poiLayer);
      });
    },

    async loadGraph() {
      this.loading = true;
      try {
        const res = await fetch('/grafo_web.geojson');
        const data = await res.json();

        const geojson = L.geoJSON(data, {
          coordsToLatLng: (coords) => { const t = proj4(UTM_32N, WGS84, [coords[0], coords[1]]); return [t[1], t[0]]; },
          style: (feature) => {
            if (feature.properties.isClosed) return { color: '#ef4444', weight: 6, dashArray: '6, 6', opacity: 1 };
            return { color: '#3b82f6', weight: 3, opacity: 0.6 };
          },
          onEachFeature: (feature, layer) => {
            const uniqueId = String(feature.properties.id_arco || feature.properties.codice);
            const uid = String(L.stamp(layer));
            this.uidIndex[uid] = layer;
            feature.properties.uniqueDbId = uniqueId;
            feature.properties._uid = uid;

            layer.on('click', (e) => {
              L.DomEvent.stopPropagation(e);
              if (e.originalEvent.ctrlKey) this.multiHighlight(layer);
              else this.highlight(layer);
              
              this.$emit('select-edge', { uid: uid, id: uniqueId, street: feature.properties.desvia, oneWay: feature.properties.sensouni, isClosed: !!feature.properties.isClosed });
            });
          }
        });

        this.graphLayer = markRaw(geojson);
        this.graphLayer.addTo(this.map);
        
        // Popola l'indice delle strade per la ricerca e "Riapri Via"
        this.dssStore.allEdges = data.features.map(f => ({
          id: String(f.properties.id_arco || f.properties.codice),
          street: f.properties.desvia || 'Senza Nome'
        }));

        this.renderPOI();
      } catch (e) { console.error("Map Load Error:", e); } finally { this.loading = false; }
    },

    syncClosures(closedIds) {
      if (!this.graphLayer) return;
      const setIds = new Set(closedIds.map(String));
      Object.values(this.uidIndex).forEach(layer => {
        const id = String(layer.feature.properties.uniqueDbId);
        const isClosed = setIds.has(id);
        layer.feature.properties.isClosed = isClosed;
        if (isClosed) layer.setStyle({ color: '#ef4444', weight: 6, dashArray: '6, 6', opacity: 1 });
        else this.graphLayer.resetStyle(layer);
      });
    },

    renderConnectedComponents(ccs) {
      if (!this.graphLayer || !ccs || !ccs.length) return;
      const colors = ['#f472b6', '#8b5cf6', '#06b6d4', '#fbbf24', '#a3e635'];
      ccs.forEach((group, index) => {
        const color = colors[index % colors.length];
        group.forEach(edgeId => {
          const layer = Object.values(this.uidIndex).find(l => String(l.feature.properties.uniqueDbId) === String(edgeId));
          if (layer) layer.setStyle({ color: color, weight: 8, opacity: 0.9, dashArray: '' });
        });
      });
    },

    syncRoutePath(pathIds) {
      if (!this.graphLayer) return;
      const setIds = new Set(pathIds.map(String));
      Object.values(this.uidIndex).forEach(layer => {
        if (setIds.has(String(layer.feature.properties.uniqueDbId))) {
          layer.setStyle({ color: '#10b981', weight: 8, opacity: 1 });
          layer.bringToFront();
        }
      });
    },

    zoomToEdgeGroup(dbId) {
      const targetId = String(dbId);
      const layer = Object.values(this.uidIndex).find(l => String(l.feature.properties.uniqueDbId) === targetId);
      if (layer) {
        this.map.flyToBounds(layer.getBounds(), { maxZoom: 18, duration: 1.2 });
        this.highlight(layer);
      }
    },

    highlight(target) {
      this.clearHighlight();
      target.setStyle({ color: '#f59e0b', weight: 8, opacity: 1 });
      this.lastSelectedUids = [target.feature.properties._uid];
    },

    multiHighlight(target) {
      const uid = target.feature.properties._uid;
      if (this.lastSelectedUids.includes(uid)) {
        this.graphLayer.resetStyle(target);
        this.lastSelectedUids = this.lastSelectedUids.filter(u => u !== uid);
      } else {
        target.setStyle({ color: '#f59e0b', weight: 8, opacity: 1 });
        this.lastSelectedUids.push(uid);
      }
    },

    clearHighlight() {
      this.lastSelectedUids.forEach(uid => {
        const layer = this.uidIndex[uid];
        if (layer) this.graphLayer.resetStyle(layer);
      });
      this.lastSelectedUids = [];
    }
  }
};
</script>

<style scoped>
.map-wrapper, #map { width: 100%; height: 100%; background: #e2e8f0; position: relative; }
.map-loader { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 15px 25px; border-radius: 8px; z-index: 1000; font-weight: 800; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); }
</style>