<template>
  <div class="chart-container">
    <canvas ref="canvas" width="340" height="180"></canvas>
  </div>
</template>

<script>
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

export default {
  name: 'ImpactChart',
  props: ['baseline', 'current'],
  data() {
    return {
      chartInstance: null
    };
  },
  mounted() {
    this.renderChart();
  },
  watch: {
    baseline() { this.renderChart(); },
    current() { this.renderChart(); }
  },
  methods: {
    renderChart() {
      if (this.chartInstance) {
        this.chartInstance.destroy();
      }

      this.chartInstance = new Chart(this.$refs.canvas, {
        type: 'bar',
        data: {
          labels: ['Impatto Temporale'],
          datasets: [
            { 
              label: 'Viabilità Ordinaria (min)', 
              data: [this.baseline], 
              backgroundColor: '#94a3b8',
              borderRadius: 4
            },
            { 
              label: 'Viabilità Deviata (min)', 
              data: [this.current], 
              backgroundColor: '#ef4444',
              borderRadius: 4
            }
          ]
        },
        options: {
          // FIX CRITICO: Disabilita il ridimensionamento automatico durante la stampa
          responsive: false, 
          maintainAspectRatio: false,
          // FIX CRITICO: Disabilita le animazioni per non ingannare lo scatto del PDF
          animation: false, 
          plugins: { 
            legend: { position: 'bottom', labels: { font: { size: 10 } } } 
          },
          scales: { 
            y: { beginAtZero: true, grace: '10%' } 
          }
        }
      });
    }
  }
}
</script>

<style scoped>
.chart-container { 
  /* Dimensioni bloccate per incastrarsi perfettamente nella colonna del PDF */
  width: 340px; 
  height: 180px; 
  margin: 10px 0; 
  background: white;
}
</style>