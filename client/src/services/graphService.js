import proj4 from 'proj4';

const UTM_32N = "+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs";
const WGS84 = "EPSG:4326";

export const GraphService = {
  /**
   * Scarica il grafo, lo formatta e pre-calcola le lunghezze dei segmenti
   */
  async fetchAndProcessGraph() {
    const res = await fetch('/grafo_web.geojson');
    const geojsonData = await res.json();
    
    // Pre-calcolo della lunghezza per tutto il grafo
    const processedEdges = geojsonData.features.map(f => {
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
        length: calcLen // Lunghezza in metri
      };
    });

    return { geojsonData, processedEdges };
  },

  /**
   * Converte le coordinate da UTM a WGS84 per Leaflet
   */
  convertCoords(coords) {
    const t = proj4(UTM_32N, WGS84, [coords[0], coords[1]]); 
    return [t[1], t[0]]; 
  }
};