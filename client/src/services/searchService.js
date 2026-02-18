/**
 * @file searchService.js
 * @description Motore di indicizzazione e ricerca. 
 * Gestisce il raggruppamento dei frammenti stradali per presentare all'utente 
 * risultati univoci (una sola voce per via).
 */

export const SearchService = {
  _index: [],

  /**
   * Costruisce l'indice di ricerca raggruppando i frammenti (es. 1040_1, 1040_2)
   * in un'unica voce di ricerca (es. 1040).
   * @param {Array} roadList - Lista completa degli archi dal GeoJSON.
   */
  buildIndex(roadList) {
    const uniqueRoads = new Map();

    roadList.forEach(item => {
      // Estraiamo il codice base (es. da "1040_1" prendiamo "1040")
      const baseId = item.id.includes('_') ? item.id.split('_')[0] : item.id;
      
      // Se non abbiamo ancora inserito questa via nell'indice, la aggiungiamo.
      // Usiamo il baseId come chiave per evitare duplicati nella tendina.
      if (!uniqueRoads.has(baseId)) {
        uniqueRoads.set(baseId, {
          id: baseId,
          street: item.street,
          // Pre-calcoliamo la stringa di ricerca per performance ottimali
          _searchStr: `${baseId} ${item.street}`.toLowerCase()
        });
      }
    });

    this._index = Array.from(uniqueRoads.values());
    console.log(`SearchService: Indice raggruppato creato per ${this._index.length} vie uniche.`);
  },

  /**
   * Esegue la ricerca asincrona nell'indice raggruppato.
   * @param {string} query - Testo inserito dall'utente.
   * @returns {Promise<Array>} Risultati filtrati.
   */
  async search(query) {
    if (!query || query.length < 2) return [];
    
    const q = query.toLowerCase();
    
    return new Promise((resolve) => {
      // Il setTimeout 0 previene il blocco della UI durante il filtraggio
      setTimeout(() => {
        const results = this._index
          .filter(r => r._searchStr.includes(q))
          .slice(0, 10); // Mostriamo max 10 risultati per pulizia visiva
        resolve(results);
      }, 0);
    });
  }
};