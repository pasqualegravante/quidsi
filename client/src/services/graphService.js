import proj4 from 'proj4';

const UTM_32N = "+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs";
const WGS84 = "EPSG:4326";

export const GraphService = {
  async fetchAndProcessGraph() {
    const res = await fetch('/grafo_web.geojson');
    const geojsonData = await res.json();
    
    const processedEdges = [];

    // Modifichiamo il GeoJSON in place per Leaflet e salviamo l'UTM per il Backend
    geojsonData.features.forEach(f => {
      let calcLen = 0;
      let startNodeUTM = null;
      let endNodeUTM = null;

      if (f.geometry && f.geometry.coordinates) {
        const coords = f.geometry.coordinates;
        
        // 1. SALVIAMO I NODI UTM ORIGINALI PER PYTHON (IL PASSAPORTO)
        startNodeUTM = [coords[0][0], coords[0][1]];
        endNodeUTM = [coords[coords.length - 1][0], coords[coords.length - 1][1]];

        // 2. CONVERTIAMO LE COORDINATE DEL GEOJSON IN LAT/LNG PER LEAFLET!
        for (let i = 0; i < coords.length; i++) {
          if (i < coords.length - 1) {
            const dx = coords[i+1][0] - coords[i][0];
            const dy = coords[i+1][1] - coords[i][1];
            calcLen += Math.sqrt(dx * dx + dy * dy);
          }
          // Trasformazione per la mappa visiva
          const latLng = proj4(UTM_32N, WGS84, [coords[i][0], coords[i][1]]);
          coords[i] = [latLng[0], latLng[1]]; // [Lng, Lat] format per GeoJSON
        }
      }

      processedEdges.push({ 
        id: String(f.properties.id_arco || f.properties.codice), 
        street: f.properties.desvia || 'Senza Nome',
        oneWay: f.properties.sensouni,
        length: calcLen, 
        nodes: [startNodeUTM, endNodeUTM] // Nodi matematici intatti per NetworkX
      });
    });

    return { geojsonData, processedEdges };
  }
};