// src/utils/mapStyles.js

export const MAP_COLORS = {
  default: '#3b82f6', // Blu chiaro
  closed: '#ef4444',  // Rosso
  route: '#10b981',   // Verde Smeraldo
  selected: '#f59e0b',// Giallo/Arancio
  ccPalette: ['#f472b6', '#8b5cf6', '#06b6d4', '#fbbf24', '#a3e635'] // Colori per le componenti connesse
};

export const STYLES = {
  default:  { color: MAP_COLORS.default, weight: 3, opacity: 0.6, dashArray: '' },
  closed:   { color: MAP_COLORS.closed, weight: 6, dashArray: '6, 6', opacity: 1 },
  route:    { color: MAP_COLORS.route, weight: 8, opacity: 1, dashArray: '' },
  selected: { color: MAP_COLORS.selected, weight: 8, opacity: 1, dashArray: '' }
};

// Funzione base per calcolare lo stile gerarchico di un arco quando viene disegnato
export const getFeatureStyle = (feature) => {
  if (feature.properties.isClosed) return STYLES.closed;
  if (feature.properties.ccColor) return { color: feature.properties.ccColor, weight: 8, opacity: 0.9, dashArray: '' };
  if (feature.properties.isRoute) return STYLES.route;
  return STYLES.default;
};