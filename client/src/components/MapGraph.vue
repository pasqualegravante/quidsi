<template>
  <div class="map-wrapper">
    <div id="map" ref="mapContainer"></div>
    <div v-if="loading" class="map-loader">Sincronizzazione Grafo...</div>
  </div>
</template>

<script>
/**
 * @file MapGraph.vue
 * @description Layer Cartografico e Motore di Rendering GIS.
 */
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import proj4 from 'proj4';
import { markRaw } from 'vue';

const UTM_32N = "+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs";
const WGS84 = "EPSG:4326";

// Bounding Box di Trento e dintorni (Sud-Ovest, Nord-Est)
// Impedisce all'operatore di scorrere la mappa fuori da questa zona
const TRENTO_BOUNDS = [
  [45.9500, 11.0000], // SW
  [46.1500, 11.2500]  // NE
];

export default {
  name: 'MapGraph',
  emits: ['select-edge', 'graph-loaded'],
  data() {
    return {
      map: null, 
      graphLayer: null, 
      lastSelected: null, 
      loading: false,
      uidIndex: {}, 
      groupIndex: {},
      routeMarkers: { start: null, end: null },
      statusIconLayer: null
    };
  },
  mounted() { this.initMap(); this.loadGraph(); },
  methods: {
    initMap() {
      // Inizializzazione Mappa con vincoli territoriali (Liability #1)
      this.map = markRaw(L.map(this.$refs.mapContainer, { 
        zoomControl: false, 
        preferCanvas: true,
        maxBounds: TRENTO_BOUNDS, // Evita di uscire dal Trentino
        maxBoundsViscosity: 1.0,  // Effetto "muro di gomma" rigido ai bordi
        minZoom: 12               // Impedisce uno zoom-out eccessivo sull'Europa
      }).setView([46.0665, 11.1216], 17)); 

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { 
        attribution: '&copy; OSM',
        bounds: TRENTO_BOUNDS // Ottimizza le tile da scaricare limitandole alla zona utile
      }).addTo(this.map);
      
      this.statusIconLayer = L.layerGroup().addTo(this.map); 
      L.control.zoom({ position: 'topleft' }).addTo(this.map);
    },

    async loadGraph() {
      this.loading = true;

      // FIX MEMORY LEAK: Distrugge i layer vecchi prima di ricaricare (es. in caso di F5 simulato)
      if (this.graphLayer) {
        this.map.removeLayer(this.graphLayer);
        this.graphLayer = null;
        this.uidIndex = {};
        this.groupIndex = {};
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
              // MaxZoom impostato a 18 per evitare che zoomi "dentro" le case
              this.map.fitBounds(layer.getBounds(), { paddingBottomRight: [360, 0], maxZoom: 18 });
              this.$emit('select-edge', { uid: uid, id: dbId, street: feature.properties.desvia, oneWay: feature.properties.sensouni, isClosed: !!feature.properties.isClosed });
            });
          }
        });

        this.graphLayer = markRaw(geojson); 
        this.graphLayer.addTo(this.map);
        this.updateStatusIcons(); 
        
        this.$emit('graph-loaded', data.features.map(f => ({ id: String(f.properties.codice), street: f.properties.desvia || 'Senza nome' })));
      } catch (e) { console.error("Map Load Error:", e); } finally { this.loading = false; }
    },

    updateStatusIcons() {
      if (!this.statusIconLayer) return;
      this.statusIconLayer.clearLayers();

      Object.values(this.uidIndex).forEach(layer => {
        if (layer.feature.properties.isClosed) {
          const center = layer.getBounds().getCenter();
          const closedIcon = L.divIcon({
            className: 'status-icon-closed',
            iconSize: [18, 18],
            iconAnchor: [9, 9]
          });
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
          this.$emit('select-edge', { uid: layers[0].feature.properties._uid, id: String(layers[0].feature.properties.codice), street: layers[0].feature.properties.desvia, oneWay: layers[0].feature.properties.sensouni, isClosed: !!layers[0].feature.properties.isClosed });
        });
      }
    },

    updateSingleEdgeStyle(uid, isClosed) { 
      const layer = this.uidIndex[uid]; 
      if (layer) { 
        layer.feature.properties.isClosed = isClosed; 
        this.graphLayer.resetStyle(layer); 
        if (this.lastSelected === layer) this.highlight(layer); 
        this.updateStatusIcons(); 
      } 
    },

    updateGroupStyle(dbId, isClosed) { 
      const layers = this.groupIndex[String(dbId)]; 
      if (layers) { 
        layers.forEach(layer => { 
          layer.feature.properties.isClosed = isClosed; 
          this.graphLayer.resetStyle(layer); 
          if (this.lastSelected === layer) this.highlight(layer); 
        }); 
        this.updateStatusIcons(); 
      } 
    },

    highlight(layer) { 
      if (this.lastSelected) this.graphLayer.resetStyle(this.lastSelected); 
      layer.setStyle({ color: '#f59e0b', weight: 8, opacity: 1, dashArray: '' }); 
      this.lastSelected = layer; 
      if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) layer.bringToFront(); 
    },

    getClosedEdgesIds() {
      const closedIds = new Set();
      Object.values(this.uidIndex).forEach(layer => {
        if (layer.feature.properties.isClosed) closedIds.add(String(layer.feature.properties.codice));
      });
      return Array.from(closedIds);
    },

    drawRoute(pathIds) {
      this.clearRoute();
      pathIds.forEach(id => {
        const layers = this.groupIndex[String(id)];
        if (layers) {
          layers.forEach(layer => {
            layer.feature.properties.isRoutePath = true;
            this.graphLayer.resetStyle(layer);
            layer.bringToFront();
          });
        }
      });
      this.statusIconLayer.bringToFront();
    },

    clearRoute() {
      Object.values(this.uidIndex).forEach(layer => {
        if (layer.feature.properties.isRoutePath) {
          layer.feature.properties.isRoutePath = false;
          this.graphLayer.resetStyle(layer);
        }
      });
    },

    setRoutingMarker(uid, type) {
      const layer = this.uidIndex[uid]; if (!layer) return;
      const center = layer.getBounds().getCenter();
      if (this.routeMarkers[type]) this.map.removeLayer(this.routeMarkers[type]);
      
      const label = type === 'start' ? 'A' : 'B'; 
      const cssClass = type === 'start' ? 'marker-start' : 'marker-end';
      const customIcon = L.divIcon({ className: 'custom-map-pin', html: `<div class="pin-head ${cssClass}">${label}</div><div class="pin-pulse ${cssClass}"></div>`, iconSize: [30, 42], iconAnchor: [15, 42] });
      
      this.routeMarkers[type] = L.marker(center, { icon: customIcon }).addTo(this.map);
    },

    setCursor(cursorType) { if (this.$refs.mapContainer) { this.$refs.mapContainer.style.cursor = cursorType; } },

    resetAll() {
      this.clearRoute(); 
      if (this.lastSelected) this.graphLayer.resetStyle(this.lastSelected);
      this.lastSelected = null;
      if (this.routeMarkers.start) this.map.removeLayer(this.routeMarkers.start);
      if (this.routeMarkers.end) this.map.removeLayer(this.routeMarkers.end);
      this.routeMarkers = { start: null, end: null };
      this.statusIconLayer.clearLayers(); 
      
      Object.values(this.uidIndex).forEach(layer => { layer.feature.properties.isClosed = false; });
      if (this.graphLayer) { this.graphLayer.eachLayer(layer => { this.graphLayer.resetStyle(layer); }); }
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