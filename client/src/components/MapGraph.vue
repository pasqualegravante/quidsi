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

const UTM_32N = "+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs";
const WGS84 = "EPSG:4326";
const TRENTO_BOUNDS = [[45.9500, 11.0000], [46.1500, 11.2500]];

export default {
  name: 'MapGraph',
  // LE NUOVE PROPS DICHIRATIVE: La mappa reagisce a queste variabili
  props: {
    closedEdges: { type: Array, default: () => [] }, // Array di ID chiusi
    routePath: { type: Array, default: () => [] },   // Array di ID del percorso
    startPoint: { type: Object, default: null },
    endPoint: { type: Object, default: null },
    cursor: { type: String, default: 'grab' },
    focusEdgeId: { type: String, default: null }     // Trigger per lo zoom
  },
  emits: ['select-edge', 'graph-loaded', 'focus-consumed'],
  data() {
    return {
      map: null, graphLayer: null, lastSelected: null, loading: false,
      uidIndex: {}, groupIndex: {},
      routeMarkers: { start: null, end: null },
      statusIconLayer: null
    };
  },
  // I WATCHERS: Il cuore dell'architettura reattiva.
  // Quando App.vue cambia i dati, la mappa reagisce istantaneamente.
  watch: {
    closedEdges: {
      handler(newIds) { this.syncClosures(newIds); },
      deep: true
    },
    routePath: {
      handler(newPath) { this.syncRoutePath(newPath); },
      deep: true
    },
    startPoint(newVal) { this.syncMarker('start', newVal); },
    endPoint(newVal) { this.syncMarker('end', newVal); },
    cursor(newVal) { if (this.$refs.mapContainer) this.$refs.mapContainer.style.cursor = newVal; },
    focusEdgeId(newId) { 
      if (newId) { 
        this.zoomToEdgeGroup(newId); 
        this.$emit('focus-consumed'); // Segnala ad App che l'azione è completata
      } 
    }
  },
  mounted() { this.initMap(); this.loadGraph(); },
  methods: {
    initMap() {
      this.map = markRaw(L.map(this.$refs.mapContainer, { 
        zoomControl: false, preferCanvas: true, maxBounds: TRENTO_BOUNDS, maxBoundsViscosity: 1.0, minZoom: 12 
      }).setView([46.0665, 11.1216], 17)); 

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { 
        attribution: '&copy; OSM', bounds: TRENTO_BOUNDS 
      }).addTo(this.map);
      
      this.statusIconLayer = L.layerGroup().addTo(this.map); 
      L.control.zoom({ position: 'topleft' }).addTo(this.map);
    },

    async loadGraph() {
      this.loading = true;
      if (this.graphLayer) {
        this.map.removeLayer(this.graphLayer);
        this.graphLayer = null; this.uidIndex = {}; this.groupIndex = {};
      }
      if (this.statusIconLayer) this.statusIconLayer.clearLayers();

      try {
        const res = await fetch('/grafo_web.geojson'); 
        const data = await res.json();
        const geojson = L.geoJSON(data, {
          coordsToLatLng: (coords) => { const t = proj4(UTM_32N, WGS84, [coords[0], coords[1]]); return [t[1], t[0]]; },
          style: (feature) => {
            if (feature.properties.isClosed) return { color: '#ef4444', weight: 6, dashArray: '6, 6', opacity: 1 };
            if (feature.properties.isRoutePath) return { color: '#10b981', weight: 7, opacity: 1 };
            return { color: feature.properties.sensouni === 1 ? '#3b82f6' : '#94a3b8', weight: 3, opacity: 0.6 };
          },
          onEachFeature: (feature, layer) => {
            const uid = String(L.stamp(layer)); 
            feature.properties._uid = uid; 
            const dbId = String(feature.properties.codice);
            this.uidIndex[uid] = layer;
            if (!this.groupIndex[dbId]) this.groupIndex[dbId] = [];
            this.groupIndex[dbId].push(layer);
            
            layer.on('click', (e) => {
              L.DomEvent.stopPropagation(e);
              this.highlight(layer);
              this.$emit('select-edge', { uid: uid, id: dbId, street: feature.properties.desvia, oneWay: feature.properties.sensouni, isClosed: !!feature.properties.isClosed });
            });
          }
        });

        this.graphLayer = markRaw(geojson); 
        this.graphLayer.addTo(this.map);
        
        // Emette i dati grezzi ad App per costruire il SearchService
        this.$emit('graph-loaded', data.features.map(f => ({ id: String(f.properties.codice), street: f.properties.desvia || 'Senza nome' })));
        
        // Triggera sincronizzazione iniziale (nel caso di auto-restore da localStorage)
        if (this.closedEdges.length) this.syncClosures(this.closedEdges);
      } catch (e) { console.error("Map Load Error:", e); } finally { this.loading = false; }
    },

    // --- REATTIVITA' ---
    syncClosures(closedIds) {
      if (!this.graphLayer) return;
      const setIds = new Set(closedIds.map(String));
      Object.values(this.uidIndex).forEach(layer => {
        const id = String(layer.feature.properties.codice);
        const shouldBeClosed = setIds.has(id);
        if (layer.feature.properties.isClosed !== shouldBeClosed) {
          layer.feature.properties.isClosed = shouldBeClosed;
          this.graphLayer.resetStyle(layer);
        }
      });
      this.updateStatusIcons();
    },

    syncRoutePath(pathIds) {
      if (!this.graphLayer) return;
      const setIds = new Set(pathIds.map(String));
      Object.values(this.uidIndex).forEach(layer => {
        const id = String(layer.feature.properties.codice);
        const shouldBeRoute = setIds.has(id);
        if (layer.feature.properties.isRoutePath !== shouldBeRoute) {
          layer.feature.properties.isRoutePath = shouldBeRoute;
          this.graphLayer.resetStyle(layer);
          if (shouldBeRoute) layer.bringToFront();
        }
      });
      if (this.statusIconLayer) this.statusIconLayer.bringToFront();
    },

    syncMarker(type, point) {
      if (this.routeMarkers[type]) {
        this.map.removeLayer(this.routeMarkers[type]);
        this.routeMarkers[type] = null;
      }
      if (!point) return;

      const layer = this.uidIndex[point.uid]; 
      if (!layer) return;
      
      const center = layer.getBounds().getCenter();
      const cssClass = type === 'start' ? 'marker-start' : 'marker-end';
      const label = type === 'start' ? 'A' : 'B';
      const customIcon = L.divIcon({ className: 'custom-map-pin', html: `<div class="pin-head ${cssClass}">${label}</div><div class="pin-pulse ${cssClass}"></div>`, iconSize: [30, 42], iconAnchor: [15, 42] });
      
      this.routeMarkers[type] = L.marker(center, { icon: customIcon }).addTo(this.map);
    },

    // --- AZIONI LOCALI ---
    updateStatusIcons() {
      if (!this.statusIconLayer) return;
      this.statusIconLayer.clearLayers();
      Object.values(this.uidIndex).forEach(layer => {
        if (layer.feature.properties.isClosed) {
          const center = layer.getBounds().getCenter();
          const closedIcon = L.divIcon({ className: 'status-icon-closed', iconSize: [18, 18], iconAnchor: [9, 9] });
          L.marker(center, { icon: closedIcon, interactive: false }).addTo(this.statusIconLayer);
        }
      });
    },

    zoomToEdgeGroup(dbId) {
      const layers = this.groupIndex[String(dbId)];
      if (layers && layers.length > 0) {
        requestAnimationFrame(() => {
          const group = L.featureGroup(layers);
          this.map.fitBounds(group.getBounds(), { paddingBottomRight: [360, 0], paddingTopLeft: [20, 20], maxZoom: 18 });
          this.highlight(layers[0]);
        });
      }
    },

    highlight(layer) { 
      if (this.lastSelected) this.graphLayer.resetStyle(this.lastSelected); 
      layer.setStyle({ color: '#f59e0b', weight: 8, opacity: 1, dashArray: '' }); 
      this.lastSelected = layer; 
      if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) layer.bringToFront(); 
    }
  }
};
</script>

<style>
/* Stili Icone Globali Leaflet */
.status-icon-closed { background: #ef4444; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; }
.status-icon-closed::after { content: ''; display: block; width: 60%; height: 2px; background: white; border-radius: 1px; }

.custom-map-pin { outline: none; }
.pin-head { width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; box-shadow: 0 3px 10px rgba(0,0,0,0.3); position: relative; z-index: 2; }
.marker-start { background: #10b981; } .marker-end { background: #8b5cf6; }
.pin-pulse { position: absolute; top: 50%; left: 50%; width: 40px; height: 40px; background: inherit; border-radius: 50%; transform: translate(-50%, -50%); opacity: 0.6; z-index: 1; animation: pin-pulse-anim 2s infinite; }
@keyframes pin-pulse-anim { 0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.8; } 100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; } }
</style>

<style scoped>
.map-wrapper, #map { width: 100%; height: 100%; background: #e2e8f0; }
.map-loader { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 15px 25px; border-radius: 8px; z-index: 1000; font-weight: 800; color: #1e293b; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
:deep(.leaflet-control-zoom) { margin-top: 15px !important; margin-left: 15px !important; border: none !important; box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important; }
</style>