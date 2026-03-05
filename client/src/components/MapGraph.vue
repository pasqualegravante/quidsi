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
import { ref, shallowRef, markRaw, onMounted, onBeforeUnmount, watch } from 'vue';
import { useDssStore } from '../store/dssStore'; 
import { getFeatureStyle } from '../utils/mapStyles';
import { useMapMarkers } from '../composables/useMapMarkers';
import { useMapSync } from '../composables/useMapSync';

const UTM_32N = "+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs";
const WGS84 = "EPSG:4326";
const TRENTO_BOUNDS = [[45.9500, 11.0000], [46.1500, 11.2500]];

export default {
  name: 'MapGraph',
  props: { focusEdgeId: String },
  emits: ['select-edge', 'clear-selection', 'search-select'],

  setup(props, { emit }) {
    const dssStore = useDssStore();
    const mapContainer = ref(null);
    const loading = ref(false);
    
    // shallowRef non rende reattivi i contenuti interni -> ZERO LAG
    const map = shallowRef(null);
    const graphLayer = shallowRef(null);
    const uidIndex = shallowRef({}); 
    let resizeObserver = null;

    // --- FUNZIONI CORE (Riportate qui per stabilità) ---
    const findLayerById = (dbId) => {
      return Object.values(uidIndex.value).find(l => String(l.feature.properties.uniqueDbId) === String(dbId));
    };

    const initMap = () => {
      if (map.value) return;
      const leafletMap = L.map(mapContainer.value, {
        zoomControl: false, preferCanvas: true, maxBounds: TRENTO_BOUNDS, minZoom: 12
      }).setView([46.0665, 11.1216], 15);

      map.value = leafletMap;
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map.value);
      L.control.zoom({ position: 'topleft' }).addTo(map.value);
      map.value.on('click', () => emit('clear-selection'));
    };

    const loadGraph = async () => {
      loading.value = true;
      try {
        const res = await fetch('/grafo_web.geojson');
        const data = await res.json();
        
        const geojson = L.geoJSON(data, {
          coordsToLatLng: (coords) => { 
            const t = proj4(UTM_32N, WGS84, [coords[0], coords[1]]); 
            return [t[1], t[0]]; 
          },
          style: getFeatureStyle,
          onEachFeature: (feature, layer) => {
            const id = String(feature.properties.id_arco || feature.properties.codice);
            uidIndex.value[L.stamp(layer)] = layer;
            feature.properties.uniqueDbId = id;
            layer.on('click', (e) => {
              L.DomEvent.stopPropagation(e);
              emit('select-edge', { 
                id, street: feature.properties.desvia, oneWay: feature.properties.sensouni, 
                isClosed: !!feature.properties.isClosed, isMulti: e.originalEvent.ctrlKey 
              });
            });
          }
        });

        graphLayer.value = geojson;
        graphLayer.value.addTo(map.value);
        dssStore.allEdges = data.features.map(f => ({ 
          id: String(f.properties.id_arco || f.properties.codice), 
          street: f.properties.desvia || 'Senza Nome' 
        }));
      } finally { loading.value = false; }
    };

    const zoomToEdgeGroup = (dbId) => {
      if (!dbId || !map.value) return;
      const targetId = String(dbId);
      const matchingLayers = Object.values(uidIndex.value).filter(l => 
        String(l.feature.properties.uniqueDbId).startsWith(targetId)
      );

      if (matchingLayers.length > 0) {
        const group = L.featureGroup(matchingLayers);
        map.value.flyToBounds(group.getBounds(), { maxZoom: 17, duration: 1.2, padding: [40, 40] });

        const payloads = matchingLayers.map(layer => ({
          id: String(layer.feature.properties.uniqueDbId),
          street: layer.feature.properties.desvia,
          oneWay: layer.feature.properties.sensouni,
          isClosed: !!layer.feature.properties.isClosed,
          isMulti: true 
        }));
        emit('search-select', payloads);
        dssStore.clearMapFocus(); 
      }
    };

    // --- COMPOSABLES (Dedicati solo alla logica di ricoloramento e puntini) ---
    useMapSync(graphLayer, dssStore, uidIndex);
    useMapMarkers(map, dssStore, findLayerById);

    // Watchers
    watch(() => props.focusEdgeId, (id) => { if (id) zoomToEdgeGroup(id); });

    onMounted(() => {
      initMap();
      loadGraph();
      resizeObserver = new ResizeObserver(() => { if (map.value) map.value.invalidateSize(); });
      resizeObserver.observe(mapContainer.value);
    });

    onBeforeUnmount(() => { if (resizeObserver) resizeObserver.disconnect(); });

    return { mapContainer, loading, dssStore };
  }
};
</script>

<style scoped>
.map-wrapper, #map { width: 100%; height: 100%; background: #e2e8f0; position: relative; }
.map-loader { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 15px 25px; border-radius: 8px; z-index: 2000; font-weight: 800; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); }
</style>