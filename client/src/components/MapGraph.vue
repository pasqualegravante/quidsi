<template>
  <div class="map-wrapper" @click="hideContextMenu">
    <div id="map" ref="mapContainer"></div>
    
    <div class="controls">
      <div class="search-container">
        <input 
          type="text" 
          v-model="searchQuery" 
          @input="searchStreet" 
          placeholder="Cerca una via..."
          class="search-input"
        />
        <ul v-if="searchResults.length > 0" class="search-results">
          <li v-for="(res, index) in searchResults" :key="index" @click="selectStreet(res.layer)">
            {{ res.displayName }}
          </li>
        </ul>
      </div>
      <button class="btn-clear" @click="clearSelection">Pulisci Manuali</button>
    </div>

    <div 
      v-if="showContextMenu" 
      :style="contextMenuStyle" 
      class="custom-context-menu"
      @contextmenu.prevent
    >
      <div class="menu-header">Coordinate: {{ tempLatLng.lat.toFixed(4) }}, {{ tempLatLng.lng.toFixed(4) }}</div>
      <button @click="contextAddNode">📍 Aggiungi Nodo Qui</button>
      <button @click="map.zoomIn()">🔍 Zoom In</button>
      <button @click="map.zoomOut()">🔍 Zoom Out</button>
      <div class="menu-divider"></div>
      <button @click="hideContextMenu" class="btn-close-menu">Annulla</button>
    </div>
  </div>
</template>

<script>
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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
      // Stato Menu Contestuale
      showContextMenu: false,
      contextMenuStyle: {},
      tempLatLng: null
    };
  },
  mounted() {
    this.initMap();
    this.loadGeoJSON('/grafo_web2.geojson');
  },
  methods: {
    initMap() {
      this.map = L.map(this.$refs.mapContainer).setView([46.0665, 11.1216], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

      this.markersLayer = L.layerGroup().addTo(this.map);
      this.polylinesLayer = L.layerGroup().addTo(this.map);

      // Click sinistro: aggiunge nodo e chiude menu
      this.map.on('click', (e) => {
        this.hideContextMenu();
        this.addNode(e);
        this.resetGeoJsonStyle();
      });

      // TASTO DESTRO: Menu personalizzato
      this.map.on('contextmenu', (e) => {
        L.DomEvent.preventDefault(e); // Blocca menu browser
        this.tempLatLng = e.latlng;
        this.showContextMenu = true;
        
        // Posizionamento menu (containerPoint sono i pixel relativi al div mappa)
        this.contextMenuStyle = {
          top: `${e.containerPoint.y}px`,
          left: `${e.containerPoint.x}px`
        };
      });
    },

    async loadGeoJSON(url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    const defaultStyle = { color: '#ff7800', weight: 5, opacity: 0.65 };

    const geoLayer = L.geoJSON(data, {
      style: defaultStyle,
      onEachFeature: (feature, layer) => {
        // 1. Estrazione nome per la ricerca
        const streetName = feature.properties.name || feature.properties.VIA || "Strada senza nome";
        this.allStreets.push({ name: streetName.toLowerCase(), displayName: streetName, layer: layer });

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
          layer.setStyle({ color: '#0000ff', weight: 7, opacity: 0.9 });
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
        this.hideContextMenu();
      }
    },

    hideContextMenu() {
      this.showContextMenu = false;
    },

    searchStreet() {
      if (this.searchQuery.length < 2) return this.searchResults = [];
      const query = this.searchQuery.toLowerCase();
      this.searchResults = this.allStreets.filter(s => s.name.includes(query)).slice(0, 5);
    },

    selectStreet(layer) {
      this.resetGeoJsonStyle();
      layer.setStyle({ color: '#0000ff', weight: 8 });
      this.map.fitBounds(layer.getBounds());
      layer.openPopup();
      this.searchQuery = '';
      this.searchResults = [];
    },

    resetGeoJsonStyle() {
      this.geoJsonLayers.forEach(gj => gj.setStyle({ color: '#ff7800', weight: 5 }));
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
.map-wrapper { position: relative; width: 100%; height: 600px; }
#map { height: 100%; width: 100%; cursor: crosshair; }

.controls { position: absolute; top: 10px; right: 10px; z-index: 1000; width: 200px; }
.search-container { background: white; padding: 5px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); margin-bottom: 5px; }
.search-input { width: 100%; padding: 5px; box-sizing: border-box; }
.search-results { background: white; list-style: none; padding: 0; margin: 0; border-top: 1px solid #eee; }
.search-results li { padding: 5px; cursor: pointer; font-size: 12px; }

/* STILE MENU CONTESTUALE */
.custom-context-menu {
  position: absolute;
  z-index: 2000;
  background: white;
  min-width: 150px;
  border-radius: 6px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
  overflow: hidden;
  padding: 5px 0;
}
.menu-header { font-size: 10px; color: #888; padding: 5px 15px; border-bottom: 1px solid #eee; }
.custom-context-menu button {
  width: 100%;
  border: none;
  background: none;
  padding: 10px 15px;
  text-align: left;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s;
}
.custom-context-menu button:hover { background: #f0f7ff; color: #007bff; }
.menu-divider { height: 1px; background: #eee; margin: 5px 0; }
.btn-close-menu { color: #dc3545 !important; }

.btn-clear { width: 100%; background: white; border: 1px solid #ccc; padding: 8px; border-radius: 5px; cursor: pointer; }

:deep(.btn-popup-delete) { background: #ff4444; color: white; border: none; padding: 5px; width: 100%; border-radius: 3px; cursor: pointer; }
</style>