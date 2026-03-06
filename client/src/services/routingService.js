import { USE_MOCKS, ENDPOINTS } from '../apiConfig';
import proj4 from 'proj4';

const UTM_32N = "+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs";
const WGS84 = "EPSG:4326";

// Helper matematici
const toUTM = (lat, lng) => proj4(WGS84, UTM_32N, [lng, lat]);
const toLatLng = (x, y) => proj4(UTM_32N, WGS84, [x, y]);

export const RoutingService = {
  async calculateDijkstra(uid, scen_id, payload) {
    // payload conterrà { startPoint, endPoint, alfa } provenienti dallo store
    
    // 1. Convertiamo le coordinate da Leaflet (WGS84) al Backend (UTM)
    const startUTM = toUTM(payload.startPoint.latlng.lat, payload.startPoint.latlng.lng);
    const endUTM = toUTM(payload.endPoint.latlng.lat, payload.endPoint.latlng.lng);

    const requestBody = {
      uid,
      scenarioId: scen_id,
      alfa: payload.alfa,
      startCoords: `${startUTM[0]} ${startUTM[1]}`, // Formato "x y"
      endCoords: `${endUTM[0]} ${endUTM[1]}`       // Formato "x y"
    };

    if (USE_MOCKS) {
      await new Promise(resolve => setTimeout(resolve, 800));
      // MOCK: Simula la risposta del backend in coordinate UTM (Trento)
      const mockRawPath = [
        "662120.5 5104100.2",
        "662150.8 5104150.1",
        "662200.3 5104200.4"
      ];
      // Converte il Mock per il Frontend
      return { 
        path: mockRawPath.map(pt => {
          const [x, y] = pt.split(' ').map(Number);
          const [lng, lat] = toLatLng(x, y);
          return [lat, lng];
        }) 
      }; 
    }

    // CHIAMATA REALE AL BACKEND
    const res = await fetch(ENDPOINTS.DIJKSTRA, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    const data = await res.json();

    // 2. Convertiamo la risposta dal Backend (UTM "x y") al Frontend (WGS84 [lat, lng])
    const latLngPath = data.path.map(pt => {
      const [x, y] = pt.split(' ').map(Number);
      const [lng, lat] = toLatLng(x, y);
      return [lat, lng]; // Leaflet vuole prima la latitudine!
    });

    return { path: latLngPath };
  }
};