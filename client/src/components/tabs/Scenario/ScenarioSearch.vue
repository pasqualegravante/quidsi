<template>
  <div class="search-scenario-bar">
    <input 
      type="text" 
      :value="modelValue" 
      @input="$emit('update:modelValue', $event.target.value)"
      placeholder="Cerca per nome pratica..." 
      class="scenario-search-input" 
    />
    <button class="btn-new-inline" @click="$emit('create')">
      ➕ Nuova Pratica
    </button>
  </div>
</template>

<script>
export default {
  name: 'ScenarioSearch',
  props: { modelValue: String },
  emits: ['update:modelValue', 'create']
}
</script>

<style scoped>
.search-scenario-bar { margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px; }
.scenario-search-input { width: 100%; padding: 12px 15px; border-radius: 20px; border: 1px solid #cbd5e1; box-sizing: border-box; font-size: 13px; outline: none; }
.scenario-search-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
.btn-new-inline { background: #0f172a; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; }
.btn-new-inline:hover { background: #1e293b; }
</style>