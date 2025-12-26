<template>
  <div class="map-wrapper" @click="hideContextMenu">
    <div id="map" ref="mapContainer"></div>
  </div>
</template>

<script>
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default {
  name: 'MapGraph',
  data() {
    return {
      map: null,
      nodes: [],
      edges: [],
      markersLayer: null,
      polylinesLayer: null,
      geoJsonLayers: [],
      lastNodeId: null,
      searchQuery: '',
      searchResults: [],
      allStreets: [],
    };
  },
  mounted() {
    this.initMap();
    this.loadGeoJSON('/grafo_web2.geojson');
  },
  methods: {
    initMap() {
      // Definisci i bounds rettangolari (esempio: area intorno a Roma)
      var southWest = L.latLng(45.95, 11.00);  // Latitudine/Longitudine sud-ovest (circa cognola/sud e zone ovest)
      var northEast = L.latLng(46.20, 11.25);  // Latitudine/Longitudine nord-est (fino a Monte Bondone/Viote e zone est/nord)
      var bounds = L.latLngBounds(southWest, northEast);

      this.map = L.map(this.$refs.mapContainer, {
        maxBounds: bounds,
        minZoom: 12
      }).setView([46.0665, 11.1216], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

      this.markersLayer = L.layerGroup().addTo(this.map);
      this.polylinesLayer = L.layerGroup().addTo(this.map);
      
      // Click sinistro: aggiunge nodo e chiude menu
      this.map.on('click', (e) => {
        this.addNode(e);
        this.resetGeoJsonStyle();
      });
    },

  async loadGeoJSON(url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    const defaultStyle = { color: '#0000ff', weight: 3, opacity: 0.65 };

    const geoLayer = L.geoJSON(data, {
      //style: defaultStyle,
      onEachFeature: (feature, layer) => {
        // 1. Estrazione nome per la ricerca
        const streetName = feature.properties.desvia || "Strada senza nome";
        if(this.allStreets.indexOf(streetName.toLowerCase())==-1){
          this.allStreets.push(streetName.toLowerCase());
        }

        // 2. CREAZIONE POPUP CON TUTTI I DATI
        const container = document.createElement('div');
        container.style.minWidth = "180px";

        // Cicliamo su tutte le proprietà del GeoJSON per mostrarle nel popup
        let infoHtml = `<div style="max-height: 150px; overflow-y: auto; margin-bottom: 10px;">`;
        if (feature.properties) {
          infoHtml += Object.entries(feature.properties)
            .map(([k, v]) => `<b>${k}:</b> ${v}`)
            .join('<br>');
        }
        infoHtml += `</div><hr>`;
        container.innerHTML = infoHtml;

        // Pulsante Deseleziona (torna arancione)
        const btnDeselect = document.createElement('button');
        btnDeselect.innerText = 'Deseleziona';
        btnDeselect.className = 'btn-popup-deselect'; // Usa la classe definita nel CSS
        btnDeselect.onclick = () => {
          layer.setStyle(defaultStyle);
          layer.closePopup();
        };

        // Pulsante Elimina
        const btnDelete = document.createElement('button');
        btnDelete.innerText = 'Elimina Strada';
        btnDelete.className = 'btn-popup-delete';
        btnDelete.onclick = () => {
          if (confirm("Rimuovere questa strada?")) layer.remove();
        };

        container.appendChild(btnDeselect);
        container.appendChild(btnDelete);
        layer.bindPopup(container);

        // 3. Gestione click per evidenziare in blu
        layer.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          this.resetGeoJsonStyle();
          layer.setStyle({ color: '#ff7800', weight: 5 });
          layer.bringToFront();
        });
      }
    }).addTo(this.map);
    this.geoJsonLayers.push(geoLayer);
    
    if (geoLayer.getBounds().isValid()) this.map.fitBounds(geoLayer.getBounds());
  } catch (err) { 
    console.error("Errore caricamento dati:", err); 
  }
},
    contextAddNode() {
      if (this.tempLatLng) {
        this.addNode({ latlng: this.tempLatLng });
      }
    },

    searchStreet() {
      if (this.searchQuery.length < 2) return this.searchResults = [];
      const query = this.searchQuery.toLowerCase();
      this.searchResults = this.allStreets.filter(s => s.name.includes(query));
    },

    selectStreet(layer) {
      this.resetGeoJsonStyle();
      layer.openPopup();
      this.searchQuery = '';
      this.searchResults = [];
    },

    resetGeoJsonStyle() {
      this.geoJsonLayers.forEach(gj => gj.setStyle({ color: '#0000ff', weight: 3 }));
    },

    addNode(e) {
      const nodeId = this.nodes.length + 1;
      const node = { id: nodeId, lat: e.latlng.lat, lng: e.latlng.lng };
      this.nodes.push(node);
      L.marker([node.lat, node.lng]).addTo(this.markersLayer).bindPopup(`Nodo ${nodeId}`);

      if (this.lastNodeId !== null) {
        const from = this.nodes.find(n => n.id === this.lastNodeId);
        L.polyline([[from.lat, from.lng], [node.lat, node.lng]], { color: 'blue', weight: 3 }).addTo(this.polylinesLayer);
      }
      this.lastNodeId = nodeId;
    },

    clearSelection() {
      this.markersLayer.clearLayers();
      this.polylinesLayer.clearLayers();
      this.nodes = []; this.lastNodeId = null;
    }
  }
};
</script>

<style scoped>
.map-wrapper { position: relative; width: 100%; height: 100%; }
#map { height: 100%; width: 100%; cursor: crosshair; }

.btn-clear { width: 100%; background: white; border: 1px solid #ccc; padding: 8px; border-radius: 5px; cursor: pointer; }

:deep(.btn-popup-delete) { background: #ff4444; color: white; border: none; padding: 5px; width: 100%; border-radius: 3px; cursor: pointer; }
</style>