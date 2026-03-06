import { ref, watch } from 'vue';
import L from 'leaflet';

export function useMapDijkstra(map, props) {
  const dijkstraLayer = ref(null);

  watch(() => props.routingPath, (newPath) => {
    if (!map.value) return;
    
    // Pulisce il percorso precedente
    if (dijkstraLayer.value) {
      map.value.removeLayer(dijkstraLayer.value);
      dijkstraLayer.value = null;
    }
    
    // Se ci sono coordinate, disegna la nuova linea vettoriale verde
    if (newPath && newPath.length > 0) {
      dijkstraLayer.value = L.polyline(newPath, {
        color: '#22c55e',
        weight: 7,
        opacity: 1
      }).addTo(map.value);
    }
  }, { immediate: true, deep: true });

  return { dijkstraLayer };
}