import json

FILE_INPUT = 'grafo_web.geojson'
FILE_OUTPUT = 'grafo_web_ready.geojson'

def trasforma_geojson():
    print(f"⏳ Lettura del file {FILE_INPUT} in corso...")
    
    try:
        with open(FILE_INPUT, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"❌ Errore: Il file {FILE_INPUT} non è stato trovato nella cartella.")
        return

    contatore = {}
    archi_modificati = 0

    print("🛠️ Ristrutturazione delle proprietà (properties) in corso...")

    for feature in data.get('features', []):
        props = feature.get('properties', {})
        
        # 1. Estrai i dati dal vecchio formato (forzando il codice a stringa)
        codice_base = str(props.get('codice', '0'))
        desvia = props.get('desvia', 'Sconosciuta')
        sensouni = props.get('sensouni', 0)
        
        # 2. Calcola l'occorrenza progressiva per l'underscore
        if codice_base not in contatore:
            contatore[codice_base] = 1
        else:
            contatore[codice_base] += 1
            
        n = contatore[codice_base]
        
        # 3. CREA IL NUOVO BLOCCO PROPERTIES ESATTAMENTE COME LO VUOI TU
        nuove_properties = {
            "id_arco": f"{codice_base}_{n}",
            "codice_via": codice_base,
            "desvia": desvia,
            "sensouni": sensouni
        }
        
        # 4. Sostituisci in blocco le vecchie proprietà con le nuove
        feature['properties'] = nuove_properties
        archi_modificati += 1

    print(f"💾 Salvataggio di {archi_modificati} archi nel nuovo file...")
    
    # Salva il file mantenendo gli accenti italiani (ensure_ascii=False)
    with open(FILE_OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)

    print("✅ Fatto! Ecco l'esatto risultato del primo arco generato:")
    print(json.dumps(data['features'][0]['properties'], indent=2, ensure_ascii=False))

if __name__ == "__main__":
    trasforma_geojson()