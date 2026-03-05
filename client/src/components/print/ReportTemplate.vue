<template>
  <div class="print-only-layout">
    <div class="official-header">
      <div class="header-left">
        <h2>Città di QuidSi</h2>
        <p>Settore Viabilità - Report Tecnico Simulazione</p>
      </div>
      <div class="header-right">
        <p>Protocollo: DSS-{{ protocol }}</p>
        <p>Data: {{ currentDate }}</p>
      </div>
    </div>

    <div class="doc-title">
      <h1>ANALISI IMPATTO VIABILITÀ</h1>
      <p>Scenario Attivo: <strong>{{ dssStore.activeScenario?.label || 'Simulazione Estemporanea' }}</strong></p>
    </div>

    <div class="map-section">
      <div class="map-print-container">
        <img v-if="uiStore && uiStore.mapSnapshot" :src="uiStore.mapSnapshot" class="map-img" />
        <div v-else class="map-error">Elaborazione cartografica in corso...</div>
      </div>
    </div>

    <div class="details-grid">
      <div class="detail-col">
        <h3 class="section-label">1. Analisi Dijkstra (Percorso Ottimale)</h3>
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
        <h3 class="section-label">2. Riepilogo Chiusure Stradali</h3>
        <table class="compact-table">
          <thead>
            <tr>
              <th>Toponimo</th>
              <th>N. Segmenti</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="via in groupedClosures" :key="via.name">
              <td>{{ via.name }}</td>
              <td>{{ via.segments.length }} tratti</td>
            </tr>
            <tr v-if="groupedClosures.length === 0">
              <td colspan="2" style="text-align:center">Nessuna modifica alla rete</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="footer-area">
      <div class="sig-box">
        <p>Firma dell'Operatore Responsabile</p>
        <div class="sig-line"></div>
        <span>({{ dssStore.uid }})</span>
      </div>
      <p class="legal-notice">Documento prodotto dal sistema DSS QuidSi. I calcoli sono basati su pesatura dinamica del grafo stradale.</p>
    </div>
  </div>
</template>

<script>
import { useDssStore } from '../../store/dssStore';
import { useUiStore } from '../../store/uiStore';
import { computed } from 'vue';

export default {
  name: 'ReportTemplate',
  setup() {
    const dssStore = useDssStore();
    const uiStore = useUiStore(); // Correttamente iniettato
    
    const currentDate = computed(() => new Date().toLocaleDateString('it-IT'));
    const protocol = computed(() => Math.floor(100000 + Math.random() * 900000));

    const groupedClosures = computed(() => {
      const groups = {};
      dssStore.activeClosuresObjects.forEach(edge => {
        const name = edge.street || 'Via Sconosciuta';
        if (!groups[name]) groups[name] = { name, segments: [] };
        groups[name].segments.push(edge.id);
      });
      return Object.values(groups);
    });

    return { dssStore, uiStore, currentDate, protocol, groupedClosures };
  }
}
</script>

<style scoped>
.print-only-layout { padding: 0.8cm; font-family: 'Inter', sans-serif; color: #000; height: 100%; }
.official-header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; margin-bottom: 10px; }
.doc-title { text-align: center; margin-bottom: 15px; }
.doc-title h1 { font-size: 16px; margin: 0; text-decoration: underline; }
.map-print-container { width: 100%; height: 350px; border: 1px solid #000; margin-bottom: 15px; display: flex; justify-content: center; align-items: center; }
.map-img { width: 100%; height: 100%; object-fit: contain; }

.details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.section-label { background: #f0f0f0; padding: 4px; font-size: 11px; border-left: 3px solid #000; margin-bottom: 5px; font-weight: bold; }
.compact-table { width: 100%; border-collapse: collapse; font-size: 10px; }
.compact-table td, .compact-table th { border: 1px solid #ccc; padding: 4px; }

.footer-area { margin-top: 25px; border-top: 1px solid #ccc; position: relative; }
.sig-box { float: right; width: 220px; text-align: center; margin-top: 15px; }
.sig-line { border-bottom: 1px solid #000; margin: 30px 0 5px 0; }
.legal-notice { font-size: 8px; color: #666; margin-top: 60px; text-align: justify; }
</style>