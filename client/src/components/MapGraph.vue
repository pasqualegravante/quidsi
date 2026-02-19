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
    closedEdges: { type: Array, default: () => [] },
    routePath: { type: Array, default: () => [] },
    startPoint: { type: Object, default: null },
    endPoint: { type: Object, default: null },
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
    return { map: null, graphLayer: null, poiLayer: null, loading: false, routeMarkers: { start: null, end: null }, statusIconLayer: null, mapStateTimeout: null, lastSelectedUids: [] };
  },

  watch: {
    closedEdges: { handler(newIds) { this.syncClosures(newIds); }, deep: true },
    routePath: { handler(newPath) { this.syncRoutePath(newPath); }, deep: true },
    startPoint(newVal) { this.syncMarker('start', newVal); },
    endPoint(newVal) { this.syncMarker('end', newVal); },
    cursor(newVal) { if (this.$refs.mapContainer) this.$refs.mapContainer.style.cursor = newVal; },
    focusEdgeId(newId) { if (newId) { this.zoomToEdgeGroup(newId); this.$emit('focus-consumed'); } },
    
    sidebarOpen(newVal) {
      setTimeout(() => { if (this.map) this.map.invalidateSize(); }, 300);
      if (!newVal && this.lastSelectedUids.length > 0) this.clearHighlight();
    },

    printMode(newVal) { 
      this.syncPrintMode(newVal); 
      if (newVal && this.map) {
        setTimeout(() => {
          this.map.invalidateSize(); 
          setTimeout(() => { this.fitToScenario(); }, 50);
        }, 300);
      }
    }
  },

  mounted() { 
    this.initMap(); 
    this.loadGraph(); 
    this.renderPOI(); 
  },

  beforeUnmount() {
    if (this.mapStateTimeout) clearTimeout(this.mapStateTimeout);
    if (this.map) { this.map.off(); this.map.remove(); this.map = null; }
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
        else this.$emit('focus-consumed');
      });

      const saveState = () => {
        if (this.mapStateTimeout) clearTimeout(this.mapStateTimeout);
        this.mapStateTimeout = setTimeout(() => {
          const center = this.map.getCenter();
          StorageService.saveMapState({ lat: center.lat, lng: center.lng, zoom: this.map.getZoom() });
        }, 2000);
      };
      this.map.on('moveend', saveState);
      this.map.on('zoomend', saveState);
    },

    renderPOI() {
      if (!this.poiLayer) return;
      this.poiLayer.clearLayers();
      
      const icons = { school: '🏫', hospital: '🏥', fire: '🚒' };
      
      this.dssStore.poiList.forEach(poi => {
        const customIcon = L.divIcon({ 
          html: `<div style="font-size:20px; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.5));">${icons[poi.type] || '📍'}</div>`, 
          className: 'poi-marker', 
          iconSize: [25, 25],
          iconAnchor: [12, 25]
        });
        L.marker([poi.lat, poi.lng], { icon: customIcon })
         .addTo(this.poiLayer)
         .bindTooltip(`<strong>${poi.name}</strong>`, { direction: 'top', offset: [0, -25] });
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
            if (feature.properties.isClosed) return { color: '#ef4444', weight: 6, dashArray: '6, 6', opacity: 1 };
            if (feature.properties.isRoutePath) return { color: '#10b981', weight: 7, opacity: 1, className: 'route-ant-path' };
            const baseOpacity = this.printMode ? 0.1 : 0.6;
            return { color: feature.properties.sensouni === 1 ? '#3b82f6' : '#94a3b8', weight: 3, opacity: baseOpacity };
          },
          onEachFeature: (feature, layer) => {
            const uniqueId = String(feature.properties.id_arco || feature.properties.codice);
            const baseCodice = String(feature.properties.codice_via || feature.properties.codice);

            const rawStreet = feature.properties.desvia;
            const streetName = (rawStreet && rawStreet.trim() !== '') ? rawStreet : `Tratto Senza Nome (${uniqueId})`;

            // MODIFICATO: Estraiamo il Point_List originale prima della trasformazione Leaflet
            let edgePointList = [];
            if (feature.geometry && feature.geometry.coordinates) {
              const coords = feature.geometry.type === 'MultiLineString' 
                ? feature.geometry.coordinates[0] 
                : feature.geometry.coordinates;
              
              edgePointList = coords.map(c => [`${c[0]} ${c[1]}`]);
            }

            feature.properties.uniqueDbId = uniqueId;
            // Salviamo la reference direttamente
            feature.properties.point_list = edgePointList;
            const uid = String(L.stamp(layer));
            feature.properties._uid = uid;

            this.uidIndex[uid] = layer;
            if (!this.groupIndex[baseCodice]) this.groupIndex[baseCodice] = [];
            this.groupIndex[baseCodice].push(layer);

            layer.on('mouseover', () => {
              if (!this.lastSelectedUids.includes(uid) && !feature.properties.isRoutePath && !feature.properties.isClosed) {
                layer.setStyle({ weight: 6, color: '#60a5fa', opacity: 1 });
              }
            });
            layer.on('mouseout', () => {
              if (!this.lastSelectedUids.includes(uid)) this.graphLayer.resetStyle(layer);
            });
            layer.on('click', (e) => {
              L.DomEvent.stopPropagation(e);
              if (this.cursor !== 'crosshair') this.highlight(layer);
              
              // MODIFICATO: Emit include anche le coordinate "point_list"
              this.$emit('select-edge', { 
                uid: uid, 
                id: uniqueId, 
                street: streetName, 
                oneWay: feature.properties.sensouni, 
                isClosed: !!feature.properties.isClosed,
                point_list: edgePointList
              });
            });
          }
        });

        this.graphLayer = markRaw(geojson);
        this.graphLayer.addTo(this.map);

        // MODIFICATO: Includiamo anche il point_list nella roadList generata
        this.$emit('graph-loaded', data.features.map(f => {
          const raw = f.properties.desvia;
          const sName = (raw && raw.trim() !== '') ? raw : `Tratto Senza Nome (${f.properties.uniqueDbId})`;
          
          let edgePointList = [];
          if (f.geometry && f.geometry.coordinates) {
            const coords = f.geometry.type === 'MultiLineString' ? f.geometry.coordinates[0] : f.geometry.coordinates;
            edgePointList = coords.map(c => [`${c[0]} ${c[1]}`]);
          }

          return { 
            id: String(f.properties.uniqueDbId), 
            uid: String(f.properties._uid), 
            street: sName,
            point_list: edgePointList 
          };
        }));

        if (this.closedEdges.length) this.syncClosures(this.closedEdges);
      } catch (e) { console.error("Map Load Error:", e); } finally { this.loading = false; }
    },

    fitToScenario() {
      if (!this.graphLayer) return;
      const bounds = L.latLngBounds([]);
      let hasPoints = false;
      const addToBounds = (idList) => {
        idList.forEach(dbId => {
          const id = String(dbId);
          Object.values(this.uidIndex).forEach(layer => {
            if (String(layer.feature.properties.uniqueDbId) === id && layer.getBounds) {
              bounds.extend(layer.getBounds());
              hasPoints = true;
            }
          });
        });
      };
      addToBounds(this.closedEdges);
      addToBounds(this.routePath);
      if (this.routeMarkers.start) { bounds.extend(this.routeMarkers.start.getLatLng()); hasPoints = true; }
      if (this.routeMarkers.end) { bounds.extend(this.routeMarkers.end.getLatLng()); hasPoints = true; }
      if (hasPoints) {
        this.map.fitBounds(bounds, { padding: [30, 30], animate: false, maxZoom: 17 });
      } else {
        this.map.setView([46.0665, 11.1216], 15);
      }
    },

    syncPrintMode(isPrint) {
      if (!this.graphLayer) return;
      Object.values(this.uidIndex).forEach(layer => {
        const props = layer.feature.properties;
        if (!props.isRoutePath && !props.isClosed && !this.lastSelectedUids.includes(props._uid)) {
          this.graphLayer.resetStyle(layer);
        }
      });
    },

    syncClosures(closedIds) {
      if (!this.graphLayer) return;
      const setIds = new Set(closedIds.map(String));
      Object.values(this.uidIndex).forEach(layer => {
        const id = String(layer.feature.properties.uniqueDbId);
        const uid = String(layer.feature.properties._uid);
        const shouldBeClosed = setIds.has(id);
        if (layer.feature.properties.isClosed !== shouldBeClosed) {
          layer.feature.properties.isClosed = shouldBeClosed;
          if (!this.lastSelectedUids.includes(uid)) {
            this.graphLayer.resetStyle(layer);
          } else {
            layer.setStyle({ color: '#f59e0b', weight: 8, opacity: 1, dashArray: '' });
          }
        }
      });
      this.updateStatusIcons();
    },

    syncRoutePath(pathIds) {
      if (!this.graphLayer) return;
      const setIds = new Set(pathIds.map(String));
      Object.values(this.uidIndex).forEach(layer => {
        const id = String(layer.feature.properties.uniqueDbId);
        const uid = String(layer.feature.properties._uid);
        const shouldBeRoute = setIds.has(id);
        if (layer.feature.properties.isRoutePath !== shouldBeRoute) {
          layer.feature.properties.isRoutePath = shouldBeRoute;
          if (!this.lastSelectedUids.includes(uid)) {
            this.graphLayer.resetStyle(layer);
            if (shouldBeRoute) layer.bringToFront();
          } else {
            layer.setStyle({ color: '#f59e0b', weight: 8, opacity: 1, dashArray: '' });
          }
        }
      });
    },

    zoomToEdgeGroup(dbId) {
      if (!this.graphLayer) return;
      let layers = [];
      const targetId = String(dbId);
      if (targetId.includes('_')) {
        const specificLayer = Object.values(this.uidIndex).find(l => String(l.feature.properties.uniqueDbId) === targetId);
        if (specificLayer) layers = [specificLayer];
      } else if (this.groupIndex[targetId]) {
        layers = this.groupIndex[targetId];
      }
      if (layers.length > 0) {
        requestAnimationFrame(() => {
          const group = L.featureGroup(layers);
          this.map.flyToBounds(group.getBounds(), { paddingBottomRight: [360, 0], paddingTopLeft: [40, 40], maxZoom: 18, duration: 1.2 });
          this.highlight(layers);
          const props = layers[0].feature.properties;
          this.$emit('select-edge', { uid: props._uid, id: props.uniqueDbId, street: props.desvia, oneWay: props.sensouni, isClosed: !!props.isClosed, point_list: props.point_list });
        });
      }
    },

    highlight(target) {
      const layers = Array.isArray(target) ? target : [target];
      const newUids = layers.map(l => String(l.feature.properties._uid));
      this.clearHighlight(newUids);
      layers.forEach(layer => {
        layer.setStyle({ color: '#f59e0b', weight: 8, opacity: 1, dashArray: '' });
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) layer.bringToFront();
      });
      this.lastSelectedUids = newUids;
    },

    clearHighlight(excludeUids = []) {
      const excludeSet = new Set(excludeUids);
      this.lastSelectedUids.forEach(uid => {
        if (!excludeSet.has(uid)) {
          const layer = this.uidIndex[uid];
          if (layer) this.graphLayer.resetStyle(layer);
        }
      });
      if (excludeUids.length === 0) this.lastSelectedUids = [];
    },

    syncMarker(type, point) {
      if (this.routeMarkers[type]) { this.map.removeLayer(this.routeMarkers[type]); this.routeMarkers[type] = null; }
      if (!point) return;
      const layer = this.uidIndex[point.uid] || this.groupIndex[point.id]?.[0];
      if (!layer) return;
      const anchorPoint = layer.getBounds().getCenter();
      const cssClass = type === 'start' ? 'marker-start' : 'marker-end';
      const label = type === 'start' ? 'A' : 'B';
      const customIcon = L.divIcon({
        className: 'custom-map-pin-container',
        html: `<div class="pin-wrapper"><div class="pin-head ${cssClass}"><span>${label}</span></div><div class="pin-pulse ${cssClass}"></div><div class="pin-leg"></div></div>`,
        iconSize: [30, 42], iconAnchor: [15, 42]
      });
      this.routeMarkers[type] = markRaw(L.marker(anchorPoint, { icon: customIcon, zIndexOffset: 1000 })).addTo(this.map);
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
    }
  }
};
</script>

<style>
.status-icon-closed { background: #ef4444; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3); display: flex; align-items: center; justify-content: center; }
.status-icon-closed::after { content: ''; display: block; width: 60%; height: 2px; background: white; border-radius: 1px; }
.custom-map-pin-container { background: none !important; border: none !important; }
.pin-wrapper { position: relative; width: 30px; height: 42px; }
.pin-head { width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; position: relative; z-index: 5; box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3); }
.pin-head span { transform: rotate(45deg); color: white; font-weight: 800; font-size: 14px; }
.marker-start { background: #10b981; border: 2px solid #ffffff; }
.marker-end { background: #8b5cf6; border: 2px solid #ffffff; }
.pin-leg { width: 2px; height: 4px; background: white; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); z-index: 4; }
.pin-pulse { position: absolute; bottom: -5px; left: 50%; width: 20px; height: 10px; margin-left: -10px; background: rgba(0, 0, 0, 0.2); border-radius: 50%; z-index: 1; animation: pin-shadow-pulse 2s infinite; }
@keyframes pin-shadow-pulse { 0% { transform: scale(0.5); opacity: 0.5; } 100% { transform: scale(1.5); opacity: 0; } }

.poi-marker { background: transparent; border: none; }

@keyframes ant-path-animation {
  0% { stroke-dashoffset: 40; }
  100% { stroke-dashoffset: 0; }
}

:deep(.route-ant-path) {
  stroke-dasharray: 10 10 !important;
  animation: ant-path-animation 1s linear infinite !important;
}

@media print {
  :deep(.route-ant-path) {
    animation: none !important;
    stroke-dasharray: none !important;
  }
}
</style>

<style scoped>
.map-wrapper, #map { width: 100%; height: 100%; background: #e2e8f0; }
.map-loader { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 15px 25px; border-radius: 8px; z-index: 1000; font-weight: 800; color: #1e293b; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); }
:deep(.leaflet-control-zoom) { margin-top: 15px !important; margin-left: 15px !important; border: none !important; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important; }
</style>