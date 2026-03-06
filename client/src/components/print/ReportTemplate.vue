<template>
  <div class="print-only-layout">
    <div class="official-header">
      <div class="header-left">
        <div class="logo-box">🏙️ QuidSi</div>
        <div class="dept-info">
          <h2>Città di QuidSi</h2>
          <p>Dipartimento Mobilità e Trasporti</p>
        </div>
      </div>
      <div class="header-right">
        <p><strong>Protocollo:</strong> DSS-{{ protocol }}</p>
        <p><strong>Data Rilascio:</strong> {{ currentDate }}</p>
      </div>
    </div>

    <div class="doc-title">
      <h1>REPORT SIMULAZIONE PERCORSO E CHIUSURE</h1>
      <p class="subtitle">Scenario Analizzato: <strong>{{ dssStore.activeScenario?.label || 'Analisi Corrente' }}</strong></p>
    </div>

    <div class="map-section">
      <div class="map-print-container">
        <img v-if="uiStore && uiStore.mapSnapshot" :src="uiStore.mapSnapshot" class="map-img" />
        <div v-else class="map-error">Errore: Cartografia non disponibile</div>
      </div>
    </div>

    <div class="details-grid">
      <div class="detail-col">
        <h3 class="section-label">1. Analisi Dijkstra</h3>
        <table class="modern-table">
          <tr>
            <td><strong>Parametro di Peso (Alfa):</strong></td>
            <td>{{ dssStore.alfa.toFixed(2) }} ({{ (dssStore.alfa * 100).toFixed(0) }}% Distanza)</td>
          </tr>
          <tr>
            <td><strong>Punto di Partenza (A):</strong></td>
            <td>{{ dssStore.routingStartPoint ? 'Coordinate Selezionate' : 'Non Impostato' }}</td>
          </tr>
          <tr>
            <td><strong>Punto di Arrivo (B):</strong></td>
            <td>{{ dssStore.routingEndPoint ? 'Coordinate Selezionate' : 'Non Impostato' }}</td>
          </tr>
        </table>
      </div>

      <div class="detail-col">
        <h3 class="section-label">2. Chiusure Stradali Attive</h3>
        <table class="modern-table">
          <thead>
            <tr><th>Toponimo Strada</th><th>Segmenti Interrotti</th></tr>
          </thead>
          <tbody>
            <tr v-for="via in groupedClosures" :key="via.name">
              <td>{{ via.name }}</td>
              <td>{{ via.segments.length }} tratti chiusi</td>
            </tr>
            <tr v-if="groupedClosures.length === 0">
              <td colspan="2" style="text-align:center; color:#64748b;">Nessuna modifica alla viabilità.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="footer-area">
      <p class="legal-text">Documento generato automaticamente dal Sistema di Supporto alle Decisioni (DSS).</p>
      <div class="sig-box">
        <p>Firma Operatore Responsabile</p>
        <div class="sig-line"></div>
        <span>(Matricola: {{ dssStore.uid }})</span>
      </div>
    </div>
  </div>
</template>

<script>
import { useDssStore } from '../../store/dssStore';
import { useUiStore } from '../../store/uiStore'
import { computed } from 'vue';

export default {
  name: 'ReportTemplate',
  setup() {
    const dssStore = useDssStore();
    const uiStore = useUiStore();
    
    const groupedClosures = computed(() => {
      const groups = {};
      // Raggruppa i segmenti per nome della strada per una tabella più leggibile
      if (dssStore.activeClosuresObjects) {
        dssStore.activeClosuresObjects.forEach(edge => {
          const name = edge.street || 'Via Sconosciuta';
          if (!groups[name]) groups[name] = { name, segments: [] };
          groups[name].segments.push(edge.id);
        });
      }
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
.print-only-layout { padding: 0.5cm; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; box-sizing: border-box; }
.official-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #0f172a; padding-bottom: 10px; margin-bottom: 20px; }
.header-left { display: flex; align-items: center; gap: 15px; }
.logo-box { background: #0f172a; color: white; padding: 10px 15px; font-weight: bold; font-size: 20px; border-radius: 6px; }
.dept-info h2 { margin: 0; font-size: 18px; color: #0f172a; }
.dept-info p { margin: 2px 0 0 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
.header-right p { margin: 2px 0; font-size: 12px; text-align: right; }

.doc-title { text-align: center; margin-bottom: 25px; }
.doc-title h1 { margin: 0; font-size: 18px; letter-spacing: 1px; }
.subtitle { font-size: 14px; color: #475569; margin-top: 5px; }

.map-print-container { width: 100%; height: 450px; border: 2px solid #cbd5e1; border-radius: 8px; margin-bottom: 25px; display: flex; justify-content: center; align-items: center; overflow: hidden; background: #f8fafc; }
.map-img { width: 100%; height: 100%; object-fit: contain; }

.details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
.section-label { font-size: 13px; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px; text-transform: uppercase; }

.modern-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.modern-table th { background: #f1f5f9; text-align: left; padding: 8px; font-weight: bold; border-bottom: 2px solid #cbd5e1; }
.modern-table td { padding: 8px; border-bottom: 1px solid #e2e8f0; }

.footer-area { margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; }
.legal-text { font-size: 10px; color: #94a3b8; }
.sig-box { width: 250px; text-align: center; }
.sig-box p { font-size: 11px; margin-bottom: 40px; }
.sig-line { border-bottom: 1px solid #000; margin-bottom: 5px; }
.sig-box span { font-size: 10px; color: #64748b; }
</style>