import L from 'leaflet';

const TRENTO_BOUNDS = [[45.9500, 11.0000], [46.1500, 11.2500]];

export function useMapPrint(map, graphLayer, dijkstraLayer, props) {
  
  const prepareForPrint = () => {
    return new Promise((resolve) => {
      if (!map.value || !graphLayer.value) return resolve();
      
      const bounds = L.latLngBounds();
      let hasTargetElements = false;

      const startId = props.startPoint ? (props.startPoint.id || props.startPoint) : null;
      const endId = props.endPoint ? (props.endPoint.id || props.endPoint) : null;

      // 1. Isola i layer rilevanti
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
          l.setStyle({ opacity: 0, weight: 0 }); // Nasconde il resto
        }
      });

      // 2. Aggiunge i bounds della linea verde del Dijkstra
      if (dijkstraLayer.value && props.routingPath && props.routingPath.length > 0) {
        bounds.extend(dijkstraLayer.value.getBounds());
        hasTargetElements = true;
      }

      // 3. Zoom asimmetrico per salvare la legenda
      if (hasTargetElements && bounds.isValid()) {
        map.value.setMaxBounds(null); 
        
        let isResolved = false;
        const finishPreparation = () => {
          if (!isResolved) {
            isResolved = true;
            resolve();
          }
        };

        map.value.once('moveend', () => setTimeout(finishPreparation, 600));

        // 🔥 FIX LEGENDA: Padding asimmetrico per spingere l'inquadratura in alto
        map.value.fitBounds(bounds, { 
          paddingTopLeft: [50, 50], 
          paddingBottomRight: [50, 160], // 160px di spazio libero in basso per la legenda!
          maxZoom: 17, 
          animate: false 
        });

        setTimeout(finishPreparation, 800); // Fallback
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

  return { prepareForPrint, restoreMapState };
}