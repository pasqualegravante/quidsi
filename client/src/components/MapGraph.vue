<template>
  <div class="map-wrapper">
    <div id="map" ref="mapContainer"></div>
    
    <div v-if="loading" class="map-loader">Sincronizzazione Grafo...</div>
  </div>
</template>

<script>
/**
 * @file MapGraph.vue
 * @description Componente di rendering cartografico avanzato basato su Leaflet.js.
 * Ottimizzato per renderizzare reti viarie complesse (>10k archi) garantendo 60fps.
 */

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import proj4 from 'proj4';
import { markRaw } from 'vue';

// Definizioni dei Sistemi di Riferimento delle Coordinate (CRS)
// UTM 32N (EPSG:25832) è lo standard usato dalla PA Italiana e dal Comune di Trento.
const UTM_32N = "+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs";
const WGS84 = "EPSG:4326"; // Standard Web Mercator richiesto da Leaflet

export default {
  name: 'MapGraph',
  emits: ['select-edge', 'graph-loaded'],
  data() {
    return {
      map: null,           // Istanza base L.Map
      graphLayer: null,    // Istanza L.GeoJSON contenente il grafo
      lastSelected: null,  // Puntatore all'ultimo arco evidenziato in memoria
      loading: false,      // Flag per overlay di sincronizzazione
      
      /** * @type {Object} Mappa hash per l'indicizzazione spaziale.
       * Struttura: { id_arco: istanza_layer_leaflet }
       * Consente l'accesso ad un arco specifico in tempo O(1) ignorando il ciclo O(n).
       */
      layersIndex: {} 
    };
  },
  mounted() {
    this.initMap();
    this.loadGraph();
  },
  methods: {
    /**
     * Inizializza il canvas cartografico.
     */
    initMap() {
      // OTTIMIZZAZIONE CRITICA: 
      // 1. preferCanvas: Sostituisce il rendering SVG (DOM pesante) con un singolo Canvas HTML5.
      // 2. markRaw: Informa Vue.js di ignorare questo oggetto nei cicli di reattività (Proxy), 
      //    risparmiando enormi quantità di memoria RAM.
      this.map = markRaw(L.map(this.$refs.mapContainer, { 
        zoomControl: false, 
        preferCanvas: true 
      }).setView([46.0665, 11.1216], 14));

      // Mappa base neutra (CartoDB Light) per massimizzare il contrasto analitico del grafo
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(this.map);
      L.control.zoom({ position: 'bottomleft' }).addTo(this.map);
    },

    /**
     * Effettua il fetch, decodifica e renderizza il dataset GeoJSON.
     */
    async loadGraph() {
      this.loading = true;
      try {
        const res = await fetch('/grafo_web.geojson');
        const data = await res.json();

        // Trasformazione CRS on-the-fly e istanziazione layer vettoriale
        const geojson = L.geoJSON(data, {
          coordsToLatLng: (coords) => {
            const t = proj4(UTM_32N, WGS84, [coords[0], coords[1]]);
            return [t[1], t[0]]; // Leaflet si aspetta [Lat, Lng], proj4 restituisce [X, Y]
          },
          style: (f) => ({ 
            color: f.properties.sensouni === 1 ? '#3b82f6' : '#94a3b8', // Regole viabilità
            weight: 2.5, 
            opacity: 0.6 
          }),
          onEachFeature: (feature, layer) => {
            // Inserimento del layer nell'Hash Map per accesso istantaneo
            this.layersIndex[feature.properties.codice] = layer;
            
            // Binding degli eventi spaziali
            layer.on('click', (e) => {
              L.DomEvent.stopPropagation(e);
              this.highlight(layer);
              this.$emit('select-edge', { 
                id: feature.properties.codice, 
                street: feature.properties.desvia, 
                oneWay: feature.properties.sensouni 
              });
            });
          }
        });

        // markRaw per prevenire overhead di reattività sull'oggetto geojson pesante
        this.graphLayer = markRaw(geojson);
        this.graphLayer.addTo(this.map);
        
        // Notifica il coordinatore (App.vue) che l'indice è pronto per il motore di ricerca
        this.$emit('graph-loaded', data.features.map(f => ({ 
          id: f.properties.codice, 
          street: f.properties.desvia || 'Senza nome' 
        })));
      } catch (e) { 
        console.error("GIS Error:", e); 
      } finally { 
        this.loading = false; 
      }
    },

    /**
     * Sposta la viewbox cartografica sull'estensione dell'arco richiesto.
     * @param {Number|String} id - Codice identificativo dell'arco.
     */
    zoomToEdge(id) {
      const l = this.layersIndex[id];
      if (l) {
        this.map.fitBounds(l.getBounds(), { padding: [100, 100], maxZoom: 17 });
        this.highlight(l);
      }
    },

    /**
     * Applica lo stile di evidenziazione "Highlight" su un layer, resettando il precedente.
     * @param {L.Layer} layer - L'istanza Leaflet dell'arco da evidenziare.
     */
    highlight(layer) {
      if (this.lastSelected) this.graphLayer.resetStyle(this.lastSelected);
      layer.setStyle({ color: '#f59e0b', weight: 6, opacity: 1 });
      this.lastSelected = layer;
    },

    /** Metodo di teardown esposto per reset globali dell'interfaccia */
    reset() {
      if (this.lastSelected) this.graphLayer.resetStyle(this.lastSelected);
      this.lastSelected = null;
    }
  }
};
</script>

<style scoped>
.map-wrapper, #map { width: 100%; height: 100%; background: #e2e8f0; }

.map-loader {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  background: white; padding: 15px 25px; border-radius: 8px; z-index: 1000;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1); font-weight: 800; color: #1e293b;
}

:deep(.leaflet-control-zoom) {
  margin-bottom: 30px !important; margin-left: 20px !important;
  border: none !important; box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
}
</style>