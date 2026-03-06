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
    const dijkstraLayer = shallowRef(null);
    const uidIndex = shallowRef({}); 
    let resizeObserver = null;

    const findLayerById = (id) => Object.values(uidIndex.value).find(l => String(l.feature.properties.uniqueDbId) === String(id));

    useMapSync(graphLayer, dssStore, uidIndex);
    useMapMarkers(map, dssStore, findLayerById);
    const { zoomToEdgeGroup } = useMapFocus(map, uidIndex, dssStore, emit);

    // 🔥 FIX: prepareForPrint ora è Asincrona e sincronizzata con Leaflet
    const prepareForPrint = () => {
      return new Promise((resolve) => {
        if (!map.value || !graphLayer.value) {
          resolve();
          return;
        }
        
        const bounds = L.latLngBounds();
        let hasTargetElements = false;

        const startId = props.startPoint ? (props.startPoint.id || props.startPoint) : null;
        const endId = props.endPoint ? (props.endPoint.id || props.endPoint) : null;

        graphLayer.value.getLayers().forEach(l => {
          const id = String(l.feature.properties.id_arco || l.feature.properties.codice);
          
          const isClosed = props.closedEdges && props.closedEdges.includes(id);
          const isStartOrEnd = (startId && id === startId) || (endId && id === endId);

          if (isClosed) {
            l.setStyle({ opacity: 1, color: '#ef4444', weight: 6 }); 
            if (l.getBounds) bounds.extend(l.getBounds());
            hasTargetElements = true;
          } else if (isStartOrEnd) {
            l.setStyle({ opacity: 1, color: '#22c55e', weight: 6 }); 
            if (l.getBounds) bounds.extend(l.getBounds());
            hasTargetElements = true;
          } else {
            l.setStyle({ opacity: 0, weight: 0 }); // INVISIBILE
          }
        });

        if (dijkstraLayer.value && props.routingPath.length > 0) {
          bounds.extend(dijkstraLayer.value.getBounds());
          hasTargetElements = true;
        }

        if (hasTargetElements && bounds.isValid()) {
          map.value.setMaxBounds(null); 
          
          let isResolved = false;
          const finishPreparation = () => {
            if (!isResolved) {
              isResolved = true;
              resolve();
            }
          };

          // Ascoltiamo l'evento nativo di Leaflet: appena finisce di muoversi...
          map.value.once('moveend', () => {
            // ...diamo giusto 600ms ai tile (le immagini di sfondo) per caricarsi da internet
            setTimeout(finishPreparation, 600); 
          });

          // Lanciamo lo zoom
          map.value.fitBounds(bounds, { 
            padding: [60, 60], 
            maxZoom: 17, 
            animate: false 
          });

          // Fallback di sicurezza: se la mappa era GIA' centrata, moveend non parte
          setTimeout(finishPreparation, 800);
        } else {
          resolve();
        }
      });
    };

    const restoreMapState = () => {
      if (!map.value || !graphLayer.value) return;
      graphLayer.value.getLayers().forEach(l => {
        graphLayer.value.resetStyle(l); 
      });
      map.value.setMaxBounds(TRENTO_BOUNDS);
    };

    watch(() => props.routingPath, (newPath) => {
      if (!map.value) return;
      if (dijkstraLayer.value) map.value.removeLayer(dijkstraLayer.value);
      
      if (newPath && newPath.length > 0) {
        dijkstraLayer.value = L.polyline(newPath, {
          color: '#22c55e',
          weight: 7,
          opacity: 1
        }).addTo(map.value);
      }
    }, { immediate: true, deep: true });

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

    return { mapContainer, loading, dssStore, prepareForPrint, restoreMapState };
  }
};
</script>

<style scoped>
.map-wrapper, #map { width: 100%; height: 100%; background: #e2e8f0; position: relative; }
.map-loader { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 15px 25px; border-radius: 8px; z-index: 2000; font-weight: 800; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); }
</style>