/**
 * @file searchService.js
 * @description Motore di indicizzazione e ricerca asincrona per non bloccare il Main Thread.
 */

export const SearchService = {
  _index: [],

  /**
   * Pre-calcola una stringa di ricerca ottimizzata per ogni arco.
   */
  buildIndex(roadList) {
    this._index = roadList.map(r => ({
      ...r,
      _searchStr: `${r.id} ${r.street}`.toLowerCase()
    }));
    console.log(`SearchService: Indice creato per ${this._index.length} archi.`);
  },

  /**
   * Esegue la ricerca in modo asincrono (simulando un WebWorker di base)
   */
  async search(query) {
    if (!query || query.length < 2) return [];
    
    const q = query.toLowerCase();
    
    // Il setTimeout a 0 avvolto in una Promise permette al browser
    // di renderizzare eventuali animazioni UI prima di fare il ciclo pesante.
    return new Promise((resolve) => {
      setTimeout(() => {
        const results = this._index
          .filter(r => r._searchStr.includes(q))
          .slice(0, 8); // Limite risultati
        resolve(results);
      }, 0);
    });
  }
};