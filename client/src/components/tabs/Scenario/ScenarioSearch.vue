<template>
  <div class="search-scenario-bar">
    <input 
      type="text" 
      :value="modelValue" 
      @input="$emit('update:modelValue', $event.target.value)"
      placeholder="Cerca scenario..." 
      class="scenario-search-input" 
    />
    <button class="btn-new-inline" @click="$emit('create')">Nuovo scenario</button>
  </div>
</template>

<script>
export default {
  name: 'ScenarioSearch',
  props: {
    modelValue: String
  },
  emits: ['update:modelValue', 'create']
}
</script>

<style scoped>
.search-scenario-bar { margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px; }
.scenario-search-input { width: 100%; padding: 12px 15px; border-radius: 20px; border: 1px solid #cbd5e1; box-sizing: border-box; font-family: 'Inter', sans-serif; font-size: 12px; outline: none; }
.scenario-search-input:focus { border-color: #2563eb; }
.btn-new-inline { background: #1e293b; color: white; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.btn-new-inline:hover { background: #0f172a; }
</style>