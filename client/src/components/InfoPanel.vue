<template>
  <div>
    <h3>Informazioni</h3>
    <div v-if="selectedNode">
      <p><strong>Nodo selezionato:</strong> {{ selectedNode.id }}</p>
      <p>Lat: {{ selectedNode.lat.toFixed(5) }}, Lng: {{ selectedNode.lng.toFixed(5) }}</p>
    </div>
    <div v-else-if="selectedEdge">
      <p><strong>Arco selezionato:</strong> Da {{ selectedEdge.from }} a {{ selectedEdge.to }}</p>
      <p>Lunghezza: {{ selectedEdge.length.toFixed(2) }} m</p>
    </div>
    <div v-else>
      Nessuna selezione attiva
    </div>
  </div>
</template>

<script>
export default {
  props: ['selectedNode', 'selectedEdge']
};
</script>

<style scoped>
h3 {
  margin-bottom: 10px;
}
</style>
