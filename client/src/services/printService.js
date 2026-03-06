import html2canvas from 'html2canvas';
import { useUiStore } from '../store/uiStore';

export const PrintService = {
  async executePrint(mapComponent, mapSelector = '.map-container') {
    const uiStore = useUiStore(); 
    const mapElement = document.querySelector(mapSelector);

    if (!mapElement) {
      uiStore.showToast("Errore: mappa non trovata.", "error");
      return;
    }

    try {
      uiStore.setCalculating(true, "Generazione Documento Ufficiale in corso...");

      // 1. Prepara la mappa (ora è molto più veloce)
      if (mapComponent && typeof mapComponent.prepareForPrint === 'function') {
        await mapComponent.prepareForPrint();
      }
      
      // 2. Scatta la foto istantaneamente con scala ottimizzata (1.5 invece di 2)
      const canvas = await html2canvas(mapElement, {
        useCORS: true, 
        scale: 1.5, // <-- COMPROMESSO PERFETTO: Ottima qualità A4, ma 2x più veloce
        backgroundColor: '#ffffff',
        logging: false // Disabilita i log in console per risparmiare ms
      });
      
      uiStore.setMapSnapshot(canvas.toDataURL('image/png'));

      // 3. Ripristina
      if (mapComponent && typeof mapComponent.restoreMapState === 'function') {
        mapComponent.restoreMapState();
      }

      // 4. Stampa
      window.print();

    } catch (error) {
      console.error("Errore report:", error);
      uiStore.showToast("Errore di generazione", "error");
    } finally {
      uiStore.setCalculating(false);
    }
  }
};