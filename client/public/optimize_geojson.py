import json

INPUT_FILE = 'grafo_web2.geojson'
OUTPUT_FILE = 'grafo_optimized.geojson'

# Velocità km/h
SPEED_MAP = {
    'PRINCIPALE': 50,
    'DEFAULT': 30
}

def estimate_speed(props):
    # Protezione contro i valori nulli (None)
    tipo = (props.get('tipo_arco') or '').upper()
    nome = (props.get('desvia') or '').upper()
    
    if 'PRINCIPALE' in tipo: return 50
    if 'SS' in nome or 'SP' in nome: return 70
    if 'PIAZZA' in nome or 'VICOLO' in nome: return 20
    return SPEED_MAP['DEFAULT']

def optimize():
    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f"Elaborazione di {len(data['features'])} segmenti...")
        new_features = []
        
        for i, feature in enumerate(data['features']):
            props = feature['properties']
            
            # 1. Genera ID univoco (fondamentale)
            segment_id = f"seg_{i}_{props.get('codice', '0')}"
            
            # 2. Arrotonda coordinate per favorire lo snapping (5 decimali = ~1 metro)
            coords = feature['geometry']['coordinates']
            rounded_coords = [[round(c[0], 5), round(c[1], 5)] for c in coords]
            
            new_props = {
                'id': segment_id,
                'name': props.get('desvia', 'Senza Nome'),
                'speed': estimate_speed(props),
                'oneway': props.get('sensouni', 0)
            }
            
            new_features.append({
                "type": "Feature",
                "properties": new_props,
                "geometry": { "type": "LineString", "coordinates": rounded_coords }
            })

        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump({"type": "FeatureCollection", "features": new_features}, f)
        
        print(f"Successo! Creato: {OUTPUT_FILE}")
    except Exception as e:
        print(f"Errore durante l'ottimizzazione: {e}")

if __name__ == "__main__":
    optimize()