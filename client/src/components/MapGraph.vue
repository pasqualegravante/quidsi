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
 * Implementa tecniche di alta efficienza (Canvas API, Vue markRaw) per elaborare
 * set di dati geografici complessi senza lag del DOM. Fornisce interfacce per
 * alterazione stili, raggruppamento ID e iniezione Marker personalizzati.
 */
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import proj4 from 'proj4';
import { markRaw } from 'vue';

// Definizioni CRS: Web Mercator (standard) e UTM32N (standard PA Italiana)
const UTM_32N = "+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs";
const WGS84 = "EPSG:4326";

export default {
  name: 'MapGraph',
  emits: ['select-edge', 'graph-loaded'],
  data() {
    return {
      map: null, 
      graphLayer: null, 
      lastSelected: null, 
      loading: false,
      
      /** @type {Object} Hashmap O(1) per frammenti esatti (UID Leaflet) */
      uidIndex: {}, 
      /** @type {Object} Hashmap per famiglie di strade (Database Comune ID -> Array) */
      groupIndex: {},
      
      /** @type {Object} Tracking dei layer Marker generati per l'algoritmo Dijkstra */
      routeMarkers: { start: null, end: null }
    };
  },
  mounted() { this.initMap(); this.loadGraph(); },
  methods: {
    /** Inizializza il canvas Leaflet ottimizzando per alte prestazioni */
    initMap() {
      this.map = markRaw(L.map(this.$refs.mapContainer, { zoomControl: false, preferCanvas: true }).setView([46.0665, 11.1216], 17)); 
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; OSM' }).addTo(this.map);
      L.control.zoom({ position: 'bottomleft' }).addTo(this.map);
    },

    /** Effettua il fetch, parsa, trasforma le coordinate e applica le logiche di colorazione al grafo spaziale */
    async loadGraph() {
      this.loading = true;
      try {
        const res = await fetch('/grafo_web.geojson'); const data = await res.json();
        const geojson = L.geoJSON(data, {
          coordsToLatLng: (coords) => { const t = proj4(UTM_32N, WGS84, [coords[0], coords[1]]); return [t[1], t[0]]; },
          style: (feature) => {
            if (feature.properties.isClosed) return { color: '#ef4444', weight: 6, dashArray: '6, 6', opacity: 1 };
            return { color: feature.properties.sensouni === 1 ? '#3b82f6' : '#94a3b8', weight: 3, opacity: 0.6 };
          },
          onEachFeature: (feature, layer) => {
            // Generazione chiavi di indicizzazione
            const uid = String(L.stamp(layer)); feature.properties._uid = uid; 
            const dbId = String(feature.properties.codice);
            
            // Popolamento dei dizionari per accesso in tempo costante O(1)
            this.uidIndex[uid] = layer;
            if (!this.groupIndex[dbId]) this.groupIndex[dbId] = [];
            this.groupIndex[dbId].push(layer);
            
            layer.on('click', (e) => {
              L.DomEvent.stopPropagation(e);
              this.highlight(layer);
              
              // Smart Offset: Sposta fluidamente la mappa a sinistra per non farsi coprire dai widget
              this.map.fitBounds(layer.getBounds(), { paddingBottomRight: [360, 0], maxZoom: 18 });
              
              this.$emit('select-edge', { uid: uid, id: dbId, street: feature.properties.desvia, oneWay: feature.properties.sensouni, isClosed: !!feature.properties.isClosed });
            });
          }
        });
        this.graphLayer = markRaw(geojson); this.graphLayer.addTo(this.map);
        this.$emit('graph-loaded', data.features.map(f => ({ id: String(f.properties.codice), street: f.properties.desvia || 'Senza nome' })));
      } catch (e) { console.error(e); } finally { this.loading = false; }
    },

    /** Centra la view cartografica abbracciando tutti i frammenti associati a un singolo ID comunale */
    zoomToEdgeGroup(dbId) {
      const layers = this.groupIndex[String(dbId)];
      if (layers && layers.length > 0) {
        requestAnimationFrame(() => {
          const group = L.featureGroup(layers);
          // Padding asimmetrico per bilanciare la presenza di Sidebar o Widget
          this.map.fitBounds(group.getBounds(), { paddingBottomRight: [360, 0], paddingTopLeft: [20, 20], maxZoom: 18 });
          this.highlight(layers[0]);
          this.$emit('select-edge', { uid: layers[0].feature.properties._uid, id: String(layers[0].feature.properties.codice), street: layers[0].feature.properties.desvia, oneWay: layers[0].feature.properties.sensouni, isClosed: !!layers[0].feature.properties.isClosed });
        });
      }
    },

    /** Aggiorna il rendering vettoriale per un SINGOLO segmento (uso UID Leaflet) */
    updateSingleEdgeStyle(uid, isClosed) { const layer = this.uidIndex[uid]; if (layer) { layer.feature.properties.isClosed = isClosed; this.graphLayer.resetStyle(layer); if (this.lastSelected === layer) this.highlight(layer); } },
    /** Aggiorna il rendering vettoriale per l'INTERA FAMIGLIA stradale (uso ID Comune) */
    updateGroupStyle(dbId, isClosed) { const layers = this.groupIndex[String(dbId)]; if (layers) { layers.forEach(layer => { layer.feature.properties.isClosed = isClosed; this.graphLayer.resetStyle(layer); if (this.lastSelected === layer) this.highlight(layer); }); } },
    
    /** Gestisce la prominenza visiva temporanea del path selezionato */
    highlight(layer) { if (this.lastSelected) this.graphLayer.resetStyle(this.lastSelected); layer.setStyle({ color: '#f59e0b', weight: 8, opacity: 1, dashArray: '' }); this.lastSelected = layer; if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) layer.bringToFront(); },

    /**
     * Inietta marker HTML personalizzati (CSS Pins) nella mappa.
     * @param {String} uid - ID Leaflet del path su cui ancorare il marker.
     * @param {String} type - Tipologia del nodo ('start' o 'end').
     */
    setRoutingMarker(uid, type) {
      const layer = this.uidIndex[uid]; if (!layer) return;
      const center = layer.getBounds().getCenter();
      if (this.routeMarkers[type]) this.map.removeLayer(this.routeMarkers[type]);
      
      const label = type === 'start' ? 'A' : 'B'; const cssClass = type === 'start' ? 'marker-start' : 'marker-end';
      const customIcon = L.divIcon({ className: 'custom-map-pin', html: `<div class="pin-head ${cssClass}">${label}</div><div class="pin-pulse ${cssClass}"></div>`, iconSize: [30, 42], iconAnchor: [15, 42] });
      
      this.routeMarkers[type] = L.marker(center, { icon: customIcon }).addTo(this.map);
    },

    /** Permette al componente padre di forzare programmaticamente il cursore per UX feedback */
    setCursor(cursorType) { if (this.$refs.mapContainer) { this.$refs.mapContainer.style.cursor = cursorType; } },

    /** Metodo di Purge: ripristina la mappa al suo stato iniziale distruggendo marker ed evidenziazioni */
    resetAll() {
      if (this.lastSelected) this.graphLayer.resetStyle(this.lastSelected);
      this.lastSelected = null;
      if (this.routeMarkers.start) this.map.removeLayer(this.routeMarkers.start);
      if (this.routeMarkers.end) this.map.removeLayer(this.routeMarkers.end);
      this.routeMarkers = { start: null, end: null };
      
      Object.values(this.uidIndex).forEach(layer => { layer.feature.properties.isClosed = false; });
      if (this.graphLayer) { this.graphLayer.eachLayer(layer => { this.graphLayer.resetStyle(layer); }); }
    }
  }
};
</script>

<style>
/* STILI GLOBALI FONDAMENTALI PER I MARKER (DEVONO ESSERE NON-SCOPED) */
.custom-map-pin { outline: none; }
.pin-head { width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-family: sans-serif; box-shadow: 0 3px 10px rgba(0,0,0,0.3); position: relative; z-index: 2; }
.pin-head::after { content: ''; display: block; width: 100%; height: 100%; transform: rotate(45deg); display: flex; align-items: center; justify-content: center; }
.marker-start { background: #10b981; } .marker-end { background: #8b5cf6; }
.pin-pulse { position: absolute; top: 50%; left: 50%; width: 40px; height: 40px; background: inherit; border-radius: 50%; transform: translate(-50%, -50%); opacity: 0.6; z-index: 1; animation: pin-pulse-anim 2s infinite; }
@keyframes pin-pulse-anim { 0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.8; } 100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; } }
</style>

<style scoped>
.map-wrapper, #map { width: 100%; height: 100%; background: #e2e8f0; }
.map-loader { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 15px 25px; border-radius: 8px; z-index: 1000; font-weight: 800; color: #1e293b; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
:deep(.leaflet-control-zoom) { margin-bottom: 30px !important; margin-left: 20px !important; border: none !important; box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important; }
</style>