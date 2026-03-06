<template>
  <div class="map-wrapper" :style="{ cursor: cursor }">
    <div id="map" ref="mapContainer"></div>
    <div v-if="loading" class="map-loader">Sincronizzazione Grafo...</div>
  </div>
</template>

<script>
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import proj4 from 'proj4';
import { ref, shallowRef, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useDssStore } from '../store/dssStore';
import { getFeatureStyle } from '../utils/mapStyles';

// Importiamo TUTTI i composables, inclusi i due nuovi appena creati
import { useMapMarkers } from '../composables/useMapMarkers';
import { useMapSync } from '../composables/useMapSync';
import { useMapFocus } from '../composables/useMapFocus';
import { useMapDijkstra } from '../composables/useMapDijkstra';
import { useMapPrint } from '../composables/useMapPrint';

const UTM_32N = "+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs";
const WGS84 = "EPSG:4326";
const TRENTO_BOUNDS = [[45.9500, 11.0000], [46.1500, 11.2500]];

export default {
  name: 'MapGraph',
  props: {
    focusEdgeId: String,
    closedEdges: { type: Array, default: () => [] },
    startPoint: Object,
    endPoint: Object,
    cursor: String,
    routingPath: { type: Array, default: () => [] }
  },
  emits: ['select-edge', 'clear-selection', 'search-select'],

  setup(props, { emit }) {
    const dssStore = useDssStore();
    const mapContainer = ref(null);
    const loading = ref(false);

    const map = shallowRef(null);
    const graphLayer = shallowRef(null);
    const uidIndex = shallowRef({});
    let resizeObserver = null;

    // Inizializzazione dei moduli logici (Composables)
    const findLayerById = (id) => Object.values(uidIndex.value).find(l => String(l.feature.properties.uniqueDbId) === String(id));

    useMapSync(graphLayer, dssStore, uidIndex);
    useMapMarkers(map, dssStore, findLayerById);
    const { zoomToEdgeGroup } = useMapFocus(map, uidIndex, dssStore, emit);

    // NUOVI COMPOSABLES
    const { dijkstraLayer } = useMapDijkstra(map, props);
    const { prepareForPrint, restoreMapState } = useMapPrint(map, graphLayer, dijkstraLayer, props);

    // Funzioni Core della Mappa
    const initMap = () => {
      if (!mapContainer.value) return;
      const leafletMap = L.map(mapContainer.value, {
        zoomControl: false, preferCanvas: true, maxBounds: TRENTO_BOUNDS, minZoom: 12
      }).setView([46.0665, 11.1216], 15);

      map.value = leafletMap;
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map.value);
      L.control.zoom({ position: 'topleft' }).addTo(map.value);
      map.value.on('click', () => emit('clear-selection'));
    };

    const loadGraph = async () => {
      if (!map.value) return;
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
              // Quando clicchiamo, prendiamo le info da allEdges che abbiamo pre-calcolato sotto
              const edgeData = dssStore.allEdges.find(edg => edg.id === id);
              emit('select-edge', { 
                ...edgeData,
                latlng: e.latlng, 
                isClosed: !!feature.properties.isClosed, 
                isMulti: e.originalEvent.ctrlKey 
              });
            });
          }
        });
        graphLayer.value = geojson;
        graphLayer.value.addTo(map.value);

        // 🔥 PRE-CALCOLO LUNGHEZZA PER TUTTO IL GRAFO
        dssStore.allEdges = data.features.map(f => {
          let calcLen = 0;
          if (f.geometry && f.geometry.coordinates) {
            const coords = f.geometry.coordinates;
            for (let i = 0; i < coords.length - 1; i++) {
              const dx = coords[i+1][0] - coords[i][0];
              const dy = coords[i+1][1] - coords[i][1];
              calcLen += Math.sqrt(dx * dx + dy * dy);
            }
          }
          return { 
            id: String(f.properties.id_arco || f.properties.codice), 
            street: f.properties.desvia || 'Senza Nome',
            oneWay: f.properties.sensouni,
            length: calcLen // Salviamo la lunghezza in metri per ogni frammento!
          };
        });

      } catch (err) {
        console.error("Errore caricamento Grafo:", err);
      } finally { loading.value = false; }
    };

    watch(() => props.focusEdgeId, (id) => { if (id) zoomToEdgeGroup(id); });

    onMounted(async () => {
      await nextTick();
      initMap();
      if (map.value) {
        await loadGraph();
        resizeObserver = new ResizeObserver(() => { if (map.value) map.value.invalidateSize(); });
        resizeObserver.observe(mapContainer.value);
      }
    });

    onBeforeUnmount(() => { if (resizeObserver) resizeObserver.disconnect(); });

    // Esponiamo le funzioni di stampa ad App.vue e ai servizi esterni
    return { mapContainer, loading, dssStore, prepareForPrint, restoreMapState };
  }
};
</script>

<style scoped>
.map-wrapper,
#map {
  width: 100%;
  height: 100%;
  background: #e2e8f0;
  position: relative;
}

.map-loader {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 15px 25px;
  border-radius: 8px;
  z-index: 2000;
  font-weight: 800;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}
</style>