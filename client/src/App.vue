<template>
  <div id="app">
    <!-- Rimuoviamo top-row e s1: MapGraph diventa l'unico figlio diretto -->
    <MapGraph
      ref="mapGraph" class="full-map"
    />
  </div>
</template>

<script>
import MapGraph from './components/MapGraph.vue';

export default {
  name: 'App',
  components: { MapGraph },
};
</script>

<style scoped>
/* 2. #app deve occupare esattamente tutta la viewport */
#app {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  overflow: hidden;        /* Anche qui, per sicurezza */
  background-color: #f0f2f5;
}

/* 3. La mappa deve riempire tutto lo spazio disponibile */
.full-map {
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;        /* Nasconde eventuali scrollbar interne */
}

/* 4. Regole specifiche per Leaflet (o simili) – quasi sempre necessarie */
.full-map .leaflet-container {
  width: 100% !important;
  height: 100% !important;
  overflow: hidden;
  border-radius: 0;
}

/* Se il tuo componente MapGraph crea un div radice interno, copri anche quello */
.full-map > div {
  width: 100% !important;
  height: 100% !important;
  overflow: hidden;
}
</style>
