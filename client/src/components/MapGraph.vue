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
import { StorageService } from '../services/storage'; // <-- AGGIUNTO

const UTM_32N = "+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs";
const WGS84 = "EPSG:4326";
const TRENTO_BOUNDS = [[45.9500, 11.0000], [46.1500, 11.2500]];

export default {
  name: 'MapGraph',
  props: {
    closedEdges: { type: Array, default: () => [] },
    routePath: { type: Array, default: () => [] },
    startPoint: { type: Object, default: null },
    endPoint: { type: Object, default: null },
    cursor: { type: String, default: 'grab' },
    focusEdgeId: { type: String, default: null },
    sidebarOpen: { type: Boolean, default: false } 
  },
  emits: ['select-edge', 'graph-loaded', 'focus-consumed', 'missed-click'],
  data() {
    return {
      map: null, graphLayer: null, lastSelected: null, loading: false,
      uidIndex: {}, groupIndex: {},
      routeMarkers: { start: null, end: null },
      statusIconLayer: null,
      mapStateTimeout: null // <-- Per evitare di spammare il localStorage muovendo il mouse
    };
  },
  watch: {
    closedEdges: { handler(newIds) { this.syncClosures(newIds); }, deep: true },
    routePath: { handler(newPath) { this.syncRoutePath(newPath); }, deep: true },
    startPoint(newVal) { this.syncMarker('start', newVal); },
    endPoint(newVal) { this.syncMarker('end', newVal); },
    cursor(newVal) { if (this.$refs.mapContainer) this.$refs.mapContainer.style.cursor = newVal; },
    focusEdgeId(newId) { 
      if (newId) { this.zoomToEdgeGroup(newId); this.$emit('focus-consumed'); } 
    },
    sidebarOpen() {
      setTimeout(() => { if (this.map) this.map.invalidateSize(); }, 300);
    }
  },
  mounted() { this.initMap(); this.loadGraph(); },
  
  beforeUnmount() {
    if (this.mapStateTimeout) clearTimeout(this.mapStateTimeout);
    if (this.map) {
      this.map.off();
      this.map.remove();
      this.map = null;
    }
  },

  methods: {
    initMap() {
      // 1. MEMORIA SPAZIALE: Recupero stato precedente
      const savedState = StorageService.getMapState();
      const initialCenter = savedState ? [savedState.lat, savedState.lng] : [46.0665, 11.1216];
      const initialZoom = savedState ? savedState.zoom : 17;

      this.map = markRaw(L.map(this.$refs.mapContainer, { 
        zoomControl: false, preferCanvas: true, maxBounds: TRENTO_BOUNDS, maxBoundsViscosity: 1.0, minZoom: 12 
      }).setView(initialCenter, initialZoom)); 

      // 2. FALLBACK MAPPA: Tile Provider di sicurezza
      const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { 
        attribution: '&copy; OSM', bounds: TRENTO_BOUNDS 
      });

      let fallbackTriggered = false;
      tileLayer.on('tileerror', () => {
        if (!fallbackTriggered) {
          fallbackTriggered = true;
          // Se CartoDB cade, passiamo all'OSM standard per non lasciare lo schermo grigio
          tileLayer.setUrl('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
          console.warn("CartoDB irraggiungibile. Attivato fallback su OpenStreetMap.");
        }
      });
      tileLayer.addTo(this.map);
      
      this.statusIconLayer = markRaw(L.layerGroup()).addTo(this.map); 
      L.control.zoom({ position: 'topleft' }).addTo(this.map);

      this.map.on('click', () => {
        if (this.cursor === 'crosshair') this.$emit('missed-click');
        else this.$emit('focus-consumed');
      });

      // 3. MEMORIA SPAZIALE: Salvataggio stato con debounce (aspetta 1 sec dalla fine del movimento)
      const saveState = () => {
        if (this.mapStateTimeout) clearTimeout(this.mapStateTimeout);
        this.mapStateTimeout = setTimeout(() => {
          const center = this.map.getCenter();
          StorageService.saveMapState({ lat: center.lat, lng: center.lng, zoom: this.map.getZoom() });
        }, 1000);
      };
      this.map.on('moveend', saveState);
      this.map.on('zoomend', saveState);
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
            
            // 4. SCOPRIBILITÀ: Effetto Hover
            layer.on('mouseover', () => {
              // Evitiamo di fare l'hover sulle strade chiuse, su quelle del percorso o su quella già selezionata
              if (this.lastSelected !== layer && !feature.properties.isRoutePath && !feature.properties.isClosed) {
                layer.setStyle({ weight: 6, color: '#60a5fa', opacity: 1 });
              }
            });
            layer.on('mouseout', () => {
              if (this.lastSelected !== layer) {
                this.graphLayer.resetStyle(layer); // Riporta lo stile originale calcolato dinamicamente
              }
            });

            layer.on('click', (e) => {
              L.DomEvent.stopPropagation(e);
              this.highlight(layer);
              this.$emit('select-edge', { uid: uid, id: dbId, street: feature.properties.desvia, oneWay: feature.properties.sensouni, isClosed: !!feature.properties.isClosed });
            });
          }
        });

        this.graphLayer = markRaw(geojson); 
        this.graphLayer.addTo(this.map);
        
        this.$emit('graph-loaded', data.features.map(f => ({ id: String(f.properties.codice), street: f.properties.desvia || 'Senza nome' })));
        
        if (this.closedEdges.length) this.syncClosures(this.closedEdges);
      } catch (e) { console.error("Map Load Error:", e); } finally { this.loading = false; }
    },
    
    // ... [TUTTI GLI ALTRI METODI RIMANGONO ESATTAMENTE IDENTICI: syncClosures, syncRoutePath, syncMarker, updateStatusIcons, zoomToEdgeGroup, highlight] ...
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
      
      let latlngs = layer.getLatLngs();
      if (latlngs.length > 0 && Array.isArray(latlngs[0])) {
        latlngs = latlngs[0]; 
      }
      
      const middleIndex = Math.floor(latlngs.length / 2);
      const anchorPoint = latlngs[middleIndex] || layer.getBounds().getCenter(); 

      const cssClass = type === 'start' ? 'marker-start' : 'marker-end';
      const label = type === 'start' ? 'A' : 'B';

      const customIcon = L.divIcon({
        className: 'custom-map-pin-container',
        html: `
          <div class="pin-wrapper">
            <div class="pin-head ${cssClass}"><span>${label}</span></div>
            <div class="pin-pulse ${cssClass}"></div>
            <div class="pin-leg"></div>
          </div>
        `,
        iconSize: [30, 42],
        iconAnchor: [15, 42] 
      });
      
      this.routeMarkers[type] = markRaw(L.marker(anchorPoint, { 
        icon: customIcon,
        zIndexOffset: 1000 
      })).addTo(this.map);
    },

    updateStatusIcons() {
      if (!this.statusIconLayer) return;
      this.statusIconLayer.clearLayers();
      Object.values(this.uidIndex).forEach(layer => {
        if (layer.feature.properties.isClosed) {
          const center = layer.getBounds().getCenter();
          const closedIcon = L.divIcon({ className: 'status-icon-closed', iconSize: [18, 18], iconAnchor: [9, 9] });
          markRaw(L.marker(center, { icon: closedIcon, interactive: false })).addTo(this.statusIconLayer);
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

.custom-map-pin-container { background: none !important; border: none !important; }
.pin-wrapper { position: relative; width: 30px; height: 42px; }

.pin-head {
  width: 30px; height: 30px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  display: flex; align-items: center; justify-content: center;
  position: relative; z-index: 5;
  box-shadow: 0 3px 6px rgba(0,0,0,0.3);
}

.pin-head span { transform: rotate(45deg); color: white; font-weight: 800; font-size: 14px; }
.marker-start { background: #10b981; border: 2px solid #ffffff; }
.marker-end { background: #8b5cf6; border: 2px solid #ffffff; }

.pin-leg {
  width: 2px; height: 4px; background: white;
  position: absolute; bottom: 0; left: 50%;
  transform: translateX(-50%); z-index: 4;
}

.pin-pulse {
  position: absolute; bottom: -5px; left: 50%;
  width: 20px; height: 10px; margin-left: -10px;
  background: rgba(0,0,0,0.2); border-radius: 50%;
  z-index: 1; animation: pin-shadow-pulse 2s infinite;
}

@keyframes pin-shadow-pulse {
  0% { transform: scale(0.5); opacity: 0.5; }
  100% { transform: scale(1.5); opacity: 0; }
}
</style>

<style scoped>
.map-wrapper, #map { width: 100%; height: 100%; background: #e2e8f0; }
.map-loader { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 15px 25px; border-radius: 8px; z-index: 1000; font-weight: 800; color: #1e293b; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
:deep(.leaflet-control-zoom) { margin-top: 15px !important; margin-left: 15px !important; border: none !important; box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important; }
</style>