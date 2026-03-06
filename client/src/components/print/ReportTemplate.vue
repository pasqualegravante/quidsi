<template>
  <div class="print-only-layout">
    <div class="official-header">
      <div class="header-left">
        <div class="logo-box">ENTE</div>
        <div class="dept-info">
          <h2>Città di QuidSi</h2>
          <p>Dipartimento Mobilità e Trasporti</p>
        </div>
      </div>
      <div class="header-right">
        <p><strong>Protocollo:</strong> DSS-{{ protocol }}</p>
        <p><strong>Data:</strong> {{ currentDate }}</p>
      </div>
    </div>

    <div class="doc-title">
      <h1>REPORT SIMULAZIONE PERCORSO E CHIUSURE</h1>
      <p>Scenario: <strong>{{ dssStore.activeScenario?.label || 'Analisi Corrente' }}</strong></p>
    </div>

    <div class="map-section">
      <div class="map-print-container">
        <img v-if="uiStore && uiStore.mapSnapshot" :src="uiStore.mapSnapshot" class="map-img" />
        <div v-else class="map-error">Elaborazione cartografica in corso...</div>
      </div>
    </div>

    <div class="details-grid">
      <div class="detail-col">
        <h3 class="section-label">1. Analisi Dijkstra</h3>
        <table class="compact-table">
          <tr>
            <td><strong>Parametro Alfa:</strong></td>
            <td>{{ dssStore.alfa.toFixed(2) }}</td>
          </tr>
          <tr>
            <td><strong>Punto di Partenza (A):</strong></td>
            <td>{{ dssStore.routingStartPoint ? 'Coordinate Acquisite' : 'Non Impostato' }}</td>
          </tr>
          <tr>
            <td><strong>Punto di Arrivo (B):</strong></td>
            <td>{{ dssStore.routingEndPoint ? 'Coordinate Acquisite' : 'Non Impostato' }}</td>
          </tr>
        </table>
      </div>

      <div class="detail-col">
        <h3 class="section-label">2. Chiusure Stradali (Archi Rossi)</h3>
        <table class="compact-table">
          <thead>
            <tr><th>Toponimo</th><th>Segmenti</th></tr>
          </thead>
          <tbody>
            <tr v-for="via in groupedClosures" :key="via.name">
              <td>{{ via.name }}</td>
              <td>{{ via.segments.length }} tratti</td>
            </tr>
            <tr v-if="groupedClosures.length === 0">
              <td colspan="2" style="text-align:center">Nessuna chiusura attiva</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="footer-area">
      <div class="sig-box">
        <p>Firma Operatore Responsabile</p>
        <div class="sig-line"></div>
        <span>({{ dssStore.uid }})</span>
      </div>
    </div>
  </div>
</template>

<script>
import { useDssStore } from '../../store/dssStore';
import { useUiStore } from '../../store/uiStore';
import { computed } from 'vue';

export default {
  setup() {
    const dssStore = useDssStore();
    const uiStore = useUiStore();
    
    const groupedClosures = computed(() => {
      const groups = {};
      dssStore.activeClosuresObjects.forEach(edge => {
        const name = edge.street || 'Via Sconosciuta';
        if (!groups[name]) groups[name] = { name, segments: [] };
        groups[name].segments.push(edge.id);
      });
      return Object.values(groups);
    });

    return { 
      dssStore, uiStore, groupedClosures,
      currentDate: computed(() => new Date().toLocaleDateString('it-IT')),
      protocol: computed(() => Math.floor(100000 + Math.random() * 900000))
    };
  }
}
</script>

<style scoped>
.print-only-layout { padding: 0.8cm; font-family: 'Inter', sans-serif; color: #000; box-sizing: border-box; }
.official-header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; margin-bottom: 10px; }
.doc-title { text-align: center; margin-bottom: 15px; font-size: 14px; }

/* LA GABBIA DI CONTENIMENTO CHE SALVA L'A4 */
.map-print-container { 
  width: 100%; 
  height: 350px; 
  border: 1px solid #000; 
  margin-bottom: 15px; 
  display: flex; 
  justify-content: center; 
  align-items: center; 
  overflow: hidden; 
  background: #f8fafc;
}
.map-img { 
  width: 100%; 
  height: 100%; 
  object-fit: cover; /* Assicura che la mappa riempia lo spazio senza uscire dai bordi */
  object-position: center;
}

.details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.section-label { background: #f0f0f0; padding: 4px; font-size: 11px; border-left: 3px solid #000; margin-bottom: 5px; font-weight: bold; }
.compact-table { width: 100%; border-collapse: collapse; font-size: 10px; }
.compact-table td, .compact-table th { border: 1px solid #ccc; padding: 4px; }

.footer-area { margin-top: 30px; border-top: 1px solid #ccc; }
.sig-box { float: right; width: 200px; text-align: center; margin-top: 10px; }
.sig-line { border-bottom: 1px solid #000; margin: 30px 0 5px 0; }
</style>