<template>
  <div class="map-wrapper">
    <div id="map" ref="mapContainer"></div>
    
    <div v-if="loading" class="map-loader">
      Caricamento rete viaria...
    </div>
  </div>
</template>

<script>
/**
 * @component MapGraph
 * @description Gestisce l'integrazione con Leaflet.js per la visualizzazione della rete stradale.
 * Include logica per la riproiezione delle coordinate e l'interazione spaziale con il grafo.
 */
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import proj4 from 'proj4';

/** * Definizioni CRS (Coordinate Reference System):
 * Il grafo originale è in EPSG:25832 (UTM 32N), le mappe web richiedono EPSG:4326.
 */
const UTM_32N = "+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs";
const WGS84 = "EPSG:4326";

export default {
  name: 'MapGraph',
  emits: ['select-edge'], // Notifica al componente padre la selezione di un arco
  data() {
    return {
      map: null,          // Istanza principale della mappa
      graphLayer: null,   // Layer contenente le geometrie del grafo
      lastSelected: null, // Riferimento all'ultimo elemento evidenziato
      loading: false      // Stato del processo di caricamento
    };
  },
  mounted() {
    this.initMap();
    this.loadGraph();
  },
  methods: {
    /**
     * Inizializza la mappa Leaflet, imposta i limiti visivi e il tema grafico.
     */
    initMap() {
      // Inizializziamo senza zoom control per posizionarlo manualmente in basso
      this.map = L.map(this.$refs.mapContainer, {
        zoomControl: false 
      }).setView([46.0665, 11.1216], 14);

      // Caricamento layer cartografico di base (OpenStreetMap)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(this.map);

      // Posizionamento asimmetrico dello zoom per evitare overlap con la UI laterale
      L.control.zoom({ position: 'bottomleft' }).addTo(this.map);
    },

    /**
     * Carica asincronamente il file GeoJSON e applica la proiezione cartografica.
     */
    async loadGraph() {
      this.loading = true;
      try {
        // Fetch del dataset dalla directory statica public
        const response = await fetch('/grafo_web.geojson'); 
        if (!response.ok) throw new Error("File GeoJSON non trovato nella root");
        
        const data = await response.json();

        // Rendering del grafo con trasformazione delle coordinate UTM -> Lat/Lon
        this.graphLayer = L.geoJSON(data, {
          coordsToLatLng: (coords) => {
            const transformed = proj4(UTM_32N, WGS84, [coords[0], coords[1]]);
            return [transformed[1], transformed[0]]; // Inversione X/Y per standard Leaflet
          },
          // Logica di stile: differenziazione cromatica basata sul senso di marcia
          style: (feature) => ({
            // Blu per senso unico, Grigio per doppio senso
            color: feature.properties.sensouni === 1 ? '#2980b9' : '#7f8c8d',
            weight: 3,
            opacity: 0.6,
            lineJoin: 'round'
          }),
          onEachFeature: (feature, layer) => {
            // Gestione dell'interattività al click sull'arco
            layer.on('click', (e) => {
              L.DomEvent.stopPropagation(e); // Previene il bubbling sulla mappa
              this.highlight(layer);
              
              // Emissione dell'evento con payload dei metadati tecnici
              this.$emit('select-edge', {
                id: feature.properties.codice,
                street: feature.properties.desvia,
                oneWay: feature.properties.sensouni,
                fullData: feature.properties
              });
            });
          }
        }).addTo(this.map);

      } catch (err) {
        console.error("GIS Engine Error:", err);
      } finally {
        this.loading = false;
      }
    },

    /**
     * Evidenzia graficamente l'elemento selezionato salvando lo stato precedente.
     * @param {L.Layer} layer - Layer geometrico selezionato.
     */
    highlight(layer) {
      // Reset dello stile dell'elemento precedentemente attivo
      if (this.lastSelected) {
        this.graphLayer.resetStyle(this.lastSelected);
      }
      
      // Applicazione stile di selezione "Highlighter" arancione
      layer.setStyle({
        color: '#e67e22',
        weight: 6,
        opacity: 1
      });
      
      this.lastSelected = layer;
    },

    /**
     * Rimuove l'evidenziazione corrente (chiamato esternamente alla chiusura sidebar).
     */
    reset() {
      if (this.lastSelected) {
        this.graphLayer.resetStyle(this.lastSelected);
      }
      this.lastSelected = null;
    }
  }
};
</script>

<style scoped>
/* Struttura contenitiva */
.map-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

#map {
  width: 100%;
  height: 100%;
  background: #fdfdfd;
}

/* UI di caricamento */
.map-loader {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.95);
  padding: 15px 25px;
  border-radius: 4px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  z-index: 1500;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1px;
  color: #0a192f;
  text-transform: uppercase;
}

/* Override stili Leaflet per look moderno */
:deep(.leaflet-control-zoom) {
  border: none !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
  margin-bottom: 30px !important;
  margin-left: 20px !important;
}

:deep(.leaflet-control-zoom-in), 
:deep(.leaflet-control-zoom-out) {
  background: white !important;
  color: #333 !important;
  border: 1px solid #eee !important;
  font-weight: bold !important;
}
</style>