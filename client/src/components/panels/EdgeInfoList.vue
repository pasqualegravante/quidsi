<template>
  <div class="info-text-block">
    <p v-if="count === 1"><strong>ID:</strong> <span>{{ edge.id }}</span></p>
    <p v-else><strong>ID:</strong> <span class="badge-multi">Multipli ({{ count }} tratti)</span></p>
    
    <p><strong>Via:</strong> <span>{{ edge.street }}</span></p>
    
    <p><strong>Dir:</strong> 
      <span>
        {{ edge.oneWay === 1 ? 'Senso Unico' : 'Doppio Senso' }}
      </span>
    </p>
    
    <p><strong>Limite velocità:</strong> <span>{{ edge.speedLimit || '50 km/h' }}</span></p>
    
    <p>
      <strong>Lunghezza {{ count > 1 ? 'Totale' : '' }}:</strong> 
      <span>{{ totalLength ? Number(totalLength).toFixed(2) + ' m' : 'N.D.' }}</span>
    </p>
  </div>
</template>

<script>
export default {
  name: 'EdgeInfoList',
  props: {
    edge: { type: Object, required: true },
    count: { type: Number, default: 1 },
    totalLength: { type: Number, default: 0 }
  }
}
</script>

<style scoped>
.info-text-block p { display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; margin: 10px 0; font-size: 14px; align-items: center;}
.badge-multi { background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-weight: bold; }
</style>