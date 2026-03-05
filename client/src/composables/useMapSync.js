import { watch } from 'vue';
import { STYLES, MAP_COLORS } from '../utils/mapStyles';

export function useMapSync(graphLayer, dssStore, uidIndex) {
  
  const syncAll = () => {
    if (!graphLayer.value) return;

    const selectedIds = new Set(dssStore.selectedEdges.map(e => String(e.id)));
    const closedIds = new Set(dssStore.activeClosureIds.map(String));
    const pathIds = new Set(dssStore.dijkstraPath.map(String));
    
    // Mappa per le componenti connesse
    const ccMap = new Map();
    if (dssStore.connectedComponents) {
      dssStore.connectedComponents.forEach((group, index) => {
        const color = MAP_COLORS.ccPalette[index % MAP_COLORS.ccPalette.length];
        group.forEach(id => ccMap.set(String(id), color));
      });
    }

    Object.values(uidIndex.value).forEach(layer => {
      const id = String(layer.feature.properties.uniqueDbId);
      
      // Prepariamo le proprietà temporanee per getFeatureStyle (se necessario) o reset
      layer.feature.properties.isClosed = closedIds.has(id);
      layer.feature.properties.isRoute = pathIds.has(id);
      layer.feature.properties.ccColor = ccMap.get(id) || null;

      // Logica gerarchica di stile
      if (selectedIds.has(id)) {
        layer.setStyle(STYLES.selected);
        layer.bringToFront();
      } else {
        // Usa la funzione di stile centralizzata
        if (layer.feature.properties.isClosed) layer.setStyle(STYLES.closed);
        else if (layer.feature.properties.ccColor) layer.setStyle({ color: layer.feature.properties.ccColor, weight: 8, opacity: 0.9 });
        else if (layer.feature.properties.isRoute) {
          layer.setStyle(STYLES.route);
          layer.bringToFront();
        }
        else graphLayer.value.resetStyle(layer);
      }
    });
  };

  // Osserviamo tutto ciò che deve scatenare un ricoloramento
  watch(() => dssStore.selectedEdges, syncAll, { deep: true });
  watch(() => dssStore.activeClosureIds, syncAll, { deep: true });
  watch(() => dssStore.dijkstraPath, syncAll, { deep: true });
  watch(() => dssStore.connectedComponents, syncAll, { deep: true });

  return { syncAll };
}