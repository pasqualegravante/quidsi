import { apiClient } from './apiClient';
import proj4 from 'proj4';

const UTM_32N = "+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs";
const WGS84 = "EPSG:4326";

// Helper matematici per tradurre le coordinate tra Mappa (WGS84) e Backend (UTM)
const toUTM = (lat, lng) => proj4(WGS84, UTM_32N, [lng, lat]);
const toLatLng = (x, y) => proj4(UTM_32N, WGS84, [x, y]);

export const RoutingService = {
  
  async calculateDijkstra(uid, scenarioId, payload) {
    const startUTM = toUTM(payload.startPoint.latlng.lat, payload.startPoint.latlng.lng);
    const endUTM = toUTM(payload.endPoint.latlng.lat, payload.endPoint.latlng.lng);

    const requestBody = {
      uid,
      scenarioId,
      alfa: payload.alfa,
      startCoords: `${startUTM[0]} ${startUTM[1]}`, // Formato per il backend "x y"
      endCoords: `${endUTM[0]} ${endUTM[1]}`
    };

    // Chiamata vera al backend
    const data = await apiClient.post('/routing/dijkstra', requestBody);

    // Convertiamo la risposta dal Backend (UTM) al Frontend (WGS84)
    const latLngPath = data.path.map(pt => {
      const [x, y] = pt.split(' ').map(Number);
      const [lng, lat] = toLatLng(x, y);
      return [lat, lng]; // Leaflet vuole prima la latitudine
    });

    return { path: latLngPath };
  },

  async calculateConnectedComponents(uid, scenarioId) {
    // Chiamata per calcolare le aree isolate
    return await apiClient.get(`/routing/connected-components?uid=${uid}&scenarioId=${scenarioId}`);
  }
};