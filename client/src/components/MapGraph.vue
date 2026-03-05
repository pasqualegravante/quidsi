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
import { ref, shallowRef, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useDssStore } from '../store/dssStore'; 
import { getFeatureStyle } from '../utils/mapStyles';

import { useMapMarkers } from '../composables/useMapMarkers';
import { useMapSync } from '../composables/useMapSync';
import { useMapFocus } from '../composables/useMapFocus';

const UTM_32N = "+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs";
const WGS84 = "EPSG:4326";
const TRENTO_BOUNDS = [[45.9500, 11.0000], [46.1500, 11.2500]];

export default {
  name: 'MapGraph',
  props: { 
    focusEdgeId: String,
    closedEdges: { type: Array, default: () => [] }
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

    const findLayerById = (id) => Object.values(uidIndex.value).find(l => String(l.feature.properties.uniqueDbId) === String(id));

    useMapSync(graphLayer, dssStore, uidIndex);
    useMapMarkers(map, dssStore, findLayerById);
    const { zoomToEdgeGroup } = useMapFocus(map, uidIndex, dssStore, emit);

    // FUNZIONE CORRETTA: Zoom su Chiusure + Percorso
    const fitToReportContent = () => {
      if (!map.value || !graphLayer.value) return;
      
      const targetLayers = [];

      // 1. Aggiungiamo le chiusure
      if (props.closedEdges && props.closedEdges.length > 0) {
        const closures = graphLayer.value.getLayers().filter(l => 
          props.closedEdges.includes(String(l.feature.properties.id_arco || l.feature.properties.codice))
        );
        targetLayers.push(...closures);
      }

      // 2. Aggiungiamo il percorso (riconosciuto dallo stile blu)
      const pathLayers = graphLayer.value.getLayers().filter(l => 
        l.options.color === '#3b82f6' || l.options.weight === 6
      );
      targetLayers.push(...pathLayers);

      // Eseguiamo fitBounds SOLO se abbiamo trovato elementi validi
      if (targetLayers.length > 0) {
        const group = L.featureGroup(targetLayers);
        const bounds = group.getBounds();
        
        // Verifica di sicurezza sulle coordinate dei bounds
        if (bounds.isValid()) {
          map.value.fitBounds(bounds, { padding: [50, 50], animate: false });
        }
      }
    };

    const initMap = () => {
      if (!mapContainer.value) return;
      const leafletMap = L.map(mapContainer.value, {
        zoomControl: false, 
        preferCanvas: true, 
        maxBounds: TRENTO_BOUNDS, 
        minZoom: 12
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

    return { mapContainer, loading, dssStore, fitToReportContent };
  }
};
</script>

<style scoped>
.map-wrapper, #map { width: 100%; height: 100%; background: #e2e8f0; position: relative; }
</style>