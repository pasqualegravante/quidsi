<template>
  <header class="dss-navbar">
    <div class="navbar-brand">
      <span class="brand-quidsi">QuidSi</span>
    </div>

    <div class="navbar-search">
      <input type="text" placeholder="Cerca una via... (Esempio: via Dante)" />
    </div>

    <div class="navbar-actions">
      <button class="action-btn" @click="newScenario">
        <span class="icon">📄</span><span class="label">New</span>
      </button>
      <button class="action-btn" @click="printMap">
        <span class="icon">🖨️</span><span class="label">Stampa</span>
      </button>
      <button class="action-btn" @click="saveScenario">
        <span class="icon">💾</span><span class="label">Salva</span>
      </button>
      <button class="action-btn" @click="exportData">
        <span class="icon">📤</span><span class="label">Export</span>
      </button>
      
      <div class="operator-profile">
        <span class="icon">👤</span><span class="label">Operator</span>
      </div>
    </div>
  </header>
</template>

<script>
export default { name: 'Navbar', methods: { /* implementa azioni api */ } }
</script>

<style scoped>
.dss-navbar { height: 60px; background: #0f172a; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; color: white; border-bottom: 2px solid #1e293b; z-index: 2000; }
.brand-quidsi { color: #facc15; font-weight: 900; font-size: 20px; cursor: pointer; }
.navbar-search input { width: 400px; padding: 8px 15px; border-radius: 20px; border: none; background: #1e293b; color: white; }
.navbar-actions { display: flex; gap: 15px; }
.action-btn { background: none; border: none; color: white; cursor: pointer; display: flex; flex-direction: column; align-items: center; font-size: 10px; opacity: 0.8;}
.action-btn:hover { opacity: 1; color: #facc15; }
.operator-profile { display: flex; gap: 8px; align-items: center; margin-left: 20px; padding-left: 20px; border-left: 1px solid #334155; }
</style>