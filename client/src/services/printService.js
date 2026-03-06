import html2canvas from 'html2canvas';
import { useUiStore } from '../store/uiStore';
import { nextTick } from 'vue'; // 🔥 Importato per la sincronizzazione DOM

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

      if (mapComponent && typeof mapComponent.prepareForPrint === 'function') {
        await mapComponent.prepareForPrint();
      }
      
      const canvas = await html2canvas(mapElement, {
        useCORS: true, 
        scale: 1.5,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      // Salviamo l'immagine nello store (questo aggiornerà il ReportTemplate)
      uiStore.setMapSnapshot(canvas.toDataURL('image/png'));

      if (mapComponent && typeof mapComponent.restoreMapState === 'function') {
        mapComponent.restoreMapState();
      }

      // 🔥 FIX BUG PAGINA BIANCA: Aspettiamo che Vue aggiorni il DOM col nuovo <img src="...">
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 300));

      window.print();

    } catch (error) {
      console.error("Errore report:", error);
      uiStore.showToast("Errore di generazione", "error");
    } finally {
      uiStore.setCalculating(false);
    }
  }
};