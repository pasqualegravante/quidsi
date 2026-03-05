import L from 'leaflet';

export function useMapFocus(mapRef, uidIndexRef, dssStore, emit) {
  const zoomToEdgeGroup = (dbId) => {
    if (!dbId || !mapRef.value) return;
    
    const targetId = String(dbId);
    
    // FILTRO CORRETTO: 
    // Prendiamo il layer se l'ID è identico (es: "860")
    // OPPURE se inizia con l'ID seguito da "_" (es: "860_1")
    const matchingLayers = Object.values(uidIndexRef.value).filter(l => {
      const currentId = String(l.feature.properties.uniqueDbId);
      return currentId === targetId || currentId.startsWith(targetId + '_');
    });

    if (matchingLayers.length > 0) {
      const group = L.featureGroup(matchingLayers);
      mapRef.value.flyToBounds(group.getBounds(), { 
        maxZoom: 17, 
        duration: 1.2, 
        padding: [40, 40] 
      });

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

  return { zoomToEdgeGroup };
}