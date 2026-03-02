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
import { StorageService } from '../services/storage';
import { useDssStore } from '../store/dssStore'; 

const UTM_32N = "+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs";
const WGS84 = "EPSG:4326";
const TRENTO_BOUNDS = [[45.9500, 11.0000], [46.1500, 11.2500]];

export default {
  name: 'MapGraph',
  props: {
    cursor: { type: String, default: 'grab' },
    focusEdgeId: { type: String, default: null },
    sidebarOpen: { type: Boolean, default: false },
    printMode: { type: Boolean, default: false }
  },
  emits: ['select-edge', 'graph-loaded', 'focus-consumed', 'missed-click'],

  setup() { 
    const dssStore = useDssStore(); 
    return { dssStore }; 
  },

  created() {
    this.uidIndex = {};   
    this.groupIndex = {}; 
  },

  data() {
    return { 
      map: null, 
      graphLayer: null, 
      poiLayer: null, 
      loading: false, 
      routeMarkers: { start: null, end: null }, 
      statusIconLayer: null, 
      mapStateTimeout: null, 
      lastSelectedUids: [] 
    };
  },

  watch: {
    // Osserva le chiusure attive nello store [cite: 11, 140]
    'dssStore.activeClosureIds': { 
      handler(newIds) { this.syncClosures(newIds); }, 
      deep: true 
    },
    // Visualizzazione differenziata per componenti connesse [cite: 195, 196, 461]
    'dssStore.connectedComponents': {
      handler(newCCs) { this.renderConnectedComponents(newCCs); },
      deep: true
    },
    // Percorso Dijkstra [cite: 178, 460]
    'dssStore.dijkstraPath': { 
      handler(newPath) { this.syncRoutePath(newPath); }, 
      deep: true 
    },
    cursor(newVal) { if (this.$refs.mapContainer) this.$refs.mapContainer.style.cursor = newVal; },
    focusEdgeId(newId) { if (newId) { this.zoomToEdgeGroup(newId); this.$emit('focus-consumed'); } },
    sidebarOpen(newVal) {
      setTimeout(() => { if (this.map) this.map.invalidateSize(); }, 300);
      if (!newVal && this.lastSelectedUids.length > 0) this.clearHighlight();
    }
  },

  mounted() { 
    this.initMap(); 
    this.loadGraph(); 
    this.renderPOI(); 
  },

  methods: {
    initMap() {
      const savedState = StorageService.getMapState();
      const initialCenter = savedState ? [savedState.lat, savedState.lng] : [46.0665, 11.1216];
      const initialZoom = savedState ? savedState.zoom : 17;

      this.map = markRaw(L.map(this.$refs.mapContainer, {
        zoomControl: false, preferCanvas: true, maxBounds: TRENTO_BOUNDS, maxBoundsViscosity: 1.0, minZoom: 12
      }).setView(initialCenter, initialZoom));

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CartoDB', bounds: TRENTO_BOUNDS
      }).addTo(this.map);

      this.statusIconLayer = markRaw(L.layerGroup()).addTo(this.map);
      this.poiLayer = markRaw(L.layerGroup()).addTo(this.map); 
      L.control.zoom({ position: 'topleft' }).addTo(this.map);

      this.map.on('click', () => {
        if (this.cursor === 'crosshair') this.$emit('missed-click');
        else {
          this.clearHighlight();
          this.$emit('focus-consumed');
        }
      });
    },

    async loadGraph() {
      this.loading = true;
      try {
        const res = await fetch('/grafo_web.geojson');
        const data = await res.json();

        const geojson = L.geoJSON(data, {
          coordsToLatLng: (coords) => {
            const t = proj4(UTM_32N, WGS84, [coords[0], coords[1]]);
            return [t[1], t[0]];
          },
          style: (feature) => {
            // Colori conformi al D2 
            if (feature.properties.isClosed) return { color: '#ef4444', weight: 6, dashArray: '6, 6', opacity: 1 };
            return { color: '#3b82f6', weight: 3, opacity: 0.6 }; // Blu scuro per rete standard
          },
          onEachFeature: (feature, layer) => {
            const uniqueId = String(feature.properties.id_arco || feature.properties.codice);
            const uid = String(L.stamp(layer));
            
            this.uidIndex[uid] = layer;
            feature.properties.uniqueDbId = uniqueId;
            feature.properties._uid = uid;

            layer.on('click', (e) => {
              L.DomEvent.stopPropagation(e);
              
              // Gestione Multi-selezione con CTRL+Click 
              if (e.originalEvent.ctrlKey) {
                this.multiHighlight(layer);
              } else {
                this.highlight(layer);
              }
              
              this.$emit('select-edge', { 
                uid: uid, 
                id: uniqueId, 
                street: feature.properties.desvia, 
                oneWay: feature.properties.sensouni, 
                isClosed: !!feature.properties.isClosed
              });
            });
          }
        });

        this.graphLayer = markRaw(geojson);
        this.graphLayer.addTo(this.map);

        // Popolamento lista archi nello store per funzioni di ricerca e "Riapri Via"
        this.dssStore.allEdges = data.features.map(f => ({
          id: String(f.properties.id_arco || f.properties.codice),
          street: f.properties.desvia || 'Senza Nome'
        }));

      } catch (e) { console.error("Map Load Error:", e); } finally { this.loading = false; }
    },

    // Sincronizzazione ricolorazione archi chiusi (Rosso) [cite: 379, 140]
    syncClosures(closedIds) {
      if (!this.graphLayer) return;
      const setIds = new Set(closedIds.map(String));
      Object.values(this.uidIndex).forEach(layer => {
        const id = String(layer.feature.properties.uniqueDbId);
        const isClosed = setIds.has(id);
        layer.feature.properties.isClosed = isClosed;
        
        if (isClosed) {
          layer.setStyle({ color: '#ef4444', weight: 6, dashArray: '6, 6', opacity: 1 });
        } else {
          this.graphLayer.resetStyle(layer);
        }
      });
    },

    // Visualizzazione multicolore Aree Isolate (Connessione) [cite: 195, 196, 461]
    renderConnectedComponents(ccs) {
      if (!this.graphLayer || !ccs || !ccs.length) return;
      
      // Palette colori per distinguere le componenti connesse [cite: 196]
      const colors = ['#f472b6', '#8b5cf6', '#06b6d4', '#fbbf24', '#a3e635'];
      
      ccs.forEach((group, index) => {
        const color = colors[index % colors.length];
        group.forEach(edgeId => {
          const layer = Object.values(this.uidIndex).find(
            l => String(l.feature.properties.uniqueDbId) === String(edgeId)
          );
          if (layer) {
            layer.setStyle({ color: color, weight: 8, opacity: 0.9, dashArray: '' });
          }
        });
      });
    },

    // Percorso Dijkstra (Verde) [cite: 460]
    syncRoutePath(pathIds) {
      if (!this.graphLayer) return;
      const setIds = new Set(pathIds.map(String));
      Object.values(this.uidIndex).forEach(layer => {
        if (setIds.has(String(layer.feature.properties.uniqueDbId))) {
          layer.setStyle({ color: '#10b981', weight: 8, opacity: 1, className: 'route-ant-path' });
          layer.bringToFront();
        }
      });
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

:deep(.route-ant-path) {
  stroke-dasharray: 10 10 !important;
  animation: ant-path-animation 1s linear infinite !important;
}

@keyframes ant-path-animation {
  0% { stroke-dashoffset: 20; }
  100% { stroke-dashoffset: 0; }
}
</style>