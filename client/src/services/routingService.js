import { apiClient } from './apiClient';
import proj4 from 'proj4';

const UTM_32N = "+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs";
const WGS84 = "EPSG:4326";

const toUTM = (lat, lng) => proj4(WGS84, UTM_32N, [lng, lat]);
const toLatLng = (x, y) => proj4(UTM_32N, WGS84, [x, y]);

export const RoutingService = {
  async calculateDijkstra(uid, scen_id, payload) {
    const startUTM = toUTM(payload.startPoint.latlng.lat, payload.startPoint.latlng.lng);
    const endUTM = toUTM(payload.endPoint.latlng.lat, payload.endPoint.latlng.lng);

    const requestBody = {
      id: scen_id,
      alfa: payload.alfa,
      source: `${startUTM[0]} ${startUTM[1]}`, 
      target: `${endUTM[0]} ${endUTM[1]}`
    };

    // CHIAMATA REALE AL BACKEND (via proxy Node)
    const data = await apiClient.post('/engine/compute/dijkstra', requestBody);

    const latLngPath = data.map(pt => {
      const [x, y] = pt.split(' ').map(Number);
      const [lng, lat] = toLatLng(x, y);
      return [lat, lng];
    });

    return { path: latLngPath };
  },

  async calculateConnectedComponents(uid, scen_id) {
    return await apiClient.post(`/engine/compute/scc`, { id: scen_id });
  }
};