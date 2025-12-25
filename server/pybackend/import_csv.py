import csv
from pathlib import Path
import tkinter as tk #Libreria di python utile alla selezione di un file
from tkinter import filedialog

print("=== AVVIO IMPORTAZIONE GRAFO STRADALE ===")

# Nasconde la finestra principale di tkinter (non vogliamo vederla)
tk.Tk().withdraw()

# Apre direttamente la finestra di selezione file
print("Seleziona il file CSV contenente il grafo stradale...")
percorso_csv = filedialog.askopenfilename(
    title="Scegli il file CSV del grafo",
    filetypes=[
        ("File CSV", "*.csv"),
        ("Tutti i file", "*.*")
    ]
)

# Se l'utente chiude la finestra o preme Annulla
if not percorso_csv:
    print("Nessun file selezionato. Lo script terminerà.")
    input("\nPremi Invio per chiudere...")
    exit()

print(f"File selezionato: {percorso_csv}")
print("Caricamento in corso...")

# === LETTURA DEL CSV ===
archi = []

try:
    with open(percorso_csv, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter=';')
        
        for riga in reader:
            # Pulizia spazi extra
            riga_pulita = {k.strip(): v.strip() if isinstance(v, str) else v 
                           for k, v in riga.items()}
            archi.append(riga_pulita)

    print(f"\nIMPORTAZIONE COMPLETATA!")
    print(f"Archi caricati: {len(archi)}")

    if archi:
        print(f"Colonne presenti: {list(archi[0].keys())}")

        # Stampa di verifica delle prime 5 righe
        print("\nPrime 5 righe di esempio:")
        for arco in archi[:5]:
            via = arco.get('des_via', arco.get('desvia', 'N/D'))
            print(f"  → {arco.get('codice', 'N/D')}: {via} - {arco.get('vifraz', 'N/D')} (senso: {arco.get('sensouni', 'N/D')})")
        if len(archi) > 5:
            print(f"  ... e altre {len(archi) - 5} righe")

except Exception as e:
    print(f"\nERRORE durante la lettura del file: {e}")
    input("\nPremi Invio per chiudere...")
    exit()

input("\nPremi Invio per chiudere la finestra...")