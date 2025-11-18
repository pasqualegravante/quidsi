<template>
  <div id="app">
    <div class="top-row">
      <div class="s1">
        <MapGraph ref="mapGraph" @select-node="selectNode" @select-edge="selectEdge"/>
      </div>
      <div class="s2">
        <InfoPanel :selectedNode="selectedNode" :selectedEdge="selectedEdge" />
      </div>
    </div>
    <div class="s3">
      <ActionPanel
        :selectedNode="selectedNode"
        :selectedEdge="selectedEdge"
        @deselect="deselectAll"
      />
    </div>
  </div>
</template>

<script>
import MapGraph from './components/MapGraph.vue';
import InfoPanel from './components/InfoPanel.vue';
import ActionPanel from './components/ActionPanel.vue';

export default {
  name: 'App',
  components: { MapGraph, InfoPanel, ActionPanel },
  data() {
    return {
      selectedNode: null,
      selectedEdge: null
    };
  },
  methods: {
    selectNode(node) {
      this.selectedNode = node;
      this.selectedEdge = null;
    },
    selectEdge(edge) {
      this.selectedEdge = edge;
      this.selectedNode = null;
    },
    deselectAll() {
      this.selectedNode = null;
      this.selectedEdge = null;
      this.$refs.mapGraph.clearSelection();
    }
  }
};
</script>

<style>
#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.top-row {
  display: flex;
  flex: 1;
}

.s1 {
  flex: 7;
  border: 1px solid #ccc;
}

.s2 {
  flex: 3;
  border: 1px solid #ccc;
  padding: 10px;
  overflow-y: auto;
  background: #f0f0f0;
}

.s3 {
  height: 200px;
  border: 1px solid #ccc;
  padding: 10px;
  background-color: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-around;
}
</style>
