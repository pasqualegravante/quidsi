import { watch } from 'vue';
import { STYLES, MAP_COLORS } from '../utils/mapStyles';

export function useMapSync(graphLayerRef, dssStore, uidIndex) {
  const syncAll = () => {
    const graphLayer = graphLayerRef.value;
    if (!graphLayer) return;

    const selectedIds = new Set(dssStore.selectedEdges.map(e => String(e.id)));
    const closedIds = new Set(dssStore.activeClosureIds.map(String));
    const pathIds = new Set(dssStore.dijkstraPath.map(String));
    
    const ccMap = new Map();
    if (dssStore.connectedComponents) {
      dssStore.connectedComponents.forEach((group, index) => {
        const color = MAP_COLORS.ccPalette[index % MAP_COLORS.ccPalette.length];
        group.forEach(id => ccMap.set(String(id), color));
      });
    }

    Object.values(uidIndex.value).forEach(layer => {
      const id = String(layer.feature.properties.uniqueDbId);
      
      // Reset stati interni
      layer.feature.properties.isClosed = closedIds.has(id);
      layer.feature.properties.isRoute = pathIds.has(id);
      layer.feature.properties.ccColor = ccMap.get(id) || null;

      if (selectedIds.has(id)) {
        layer.setStyle(STYLES.selected);
        layer.bringToFront();
      } else {
        if (layer.feature.properties.isClosed) layer.setStyle(STYLES.closed);
        else if (layer.feature.properties.ccColor) layer.setStyle({ color: layer.feature.properties.ccColor, weight: 8, opacity: 0.9 });
        else if (layer.feature.properties.isRoute) {
          layer.setStyle(STYLES.route);
          layer.bringToFront();
        }
        else graphLayer.resetStyle(layer);
      }
    });
  };

  watch(() => [dssStore.selectedEdges, dssStore.activeClosureIds, dssStore.dijkstraPath, dssStore.connectedComponents], 
    syncAll, { deep: true });

  return { syncAll };
}