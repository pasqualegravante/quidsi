import L from 'leaflet';
import { ref, watch } from 'vue';

export function useMapMarkers(mapInstance, dssStore, findLayerById) {
  const startPointLayer = ref(null);
  const endPointLayer = ref(null);

  const updateMarkers = () => {
    const map = mapInstance.value;
    if (!map) return;

    if (startPointLayer.value) { map.removeLayer(startPointLayer.value); startPointLayer.value = null; }
    if (endPointLayer.value) { map.removeLayer(endPointLayer.value); endPointLayer.value = null; }

    const createCircle = (pointData, color) => {
      const layer = findLayerById(pointData.id);
      if (layer) {
        let coords = layer.getLatLngs();
        if (Array.isArray(coords[0])) coords = coords[0];
        const midPoint = coords[Math.floor(coords.length / 2)];

        return L.circleMarker(midPoint, {
          radius: 6,
          fillColor: color,
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 1,
          interactive: false
        }).addTo(map);
      }
      return null;
    };

    if (dssStore.routingStartPoint) {
      startPointLayer.value = createCircle(dssStore.routingStartPoint, '#3b82f6');
    }
    if (dssStore.routingEndPoint) {
      endPointLayer.value = createCircle(dssStore.routingEndPoint, '#ef4444');
    }
  };

  watch(() => dssStore.routingStartPoint, updateMarkers, { deep: true });
  watch(() => dssStore.routingEndPoint, updateMarkers, { deep: true });

  return { updateMarkers };
}