import csv
import networkx as nx

# specifico cosa esportare dal translator "from translator import"
__all__ = ['csv_to_nx']

# scrivere il path in modo migliore(va bene scriverlo come percorso relativo? Intanto funziona.)
def csv_to_nx(csv_path="../../grafo_web.csv"):

    graph = nx.digraph.DiGraph()
    
    try:
        with open(csv_path, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f, delimiter=';')

            for riga in reader:
                # Pulizia spazi extra
                riga_pulita = {k.strip(): v.strip() if isinstance(v, str) else v 
                               for k, v in riga.items()}
                
                #tutte le coppie di punti che definiscono la strada in questione
                wkt_linestring = (riga_pulita.get("WKT")[12:-1]).split(",")

                #ogni coppia di punti è un lato del grafo
                for idx in range (0, len(wkt_linestring)):
                    if(idx==len(wkt_linestring)-1):
                        break
                    nodeA = wkt_linestring[idx]
                    nodeB = wkt_linestring[idx+1]
                    graph.add_edge(nodeA, nodeB, id=riga_pulita.get("codice"), sensouni=riga_pulita.get("sensouni"), desvia=riga_pulita.get("desvia"), frazione=riga_pulita.get("vifraz"))
                    #manca da aggiungere al grafo i pesi sugli archi e poi ci siamo

    except Exception as e:
        print(f"\nERRORE nella costruzione del grafo dal file csv: {e}")
        graph=0
    
    return graph


def json_to_nx(data):
    pass

def nx_to_json(graph):
    pass

# le funzioni da/a json-nx servono per tradurre il grafo in json che verrà poi salvato su mongo
# sarà poi necessario, eventualmente, caricare il grafo da file json ottenuto da mongo in grafo nx
# l'idea è quella di evitare di salvare ogni volta l'intero grafo, bensì solo le modifiche
# poi per riapplicare le modifiche servirà fare un parse del json e opportunatamente modificare il grafo

# vvv test di funzionamento per csv_to_nx vvv 
'''
graph = csv_to_nx()
if(graph!=0):
    print(graph.get_edge_data("664581.81 5101530.0", "664579.69 5101528.5"))
    for k,v in graph.adjacency():
        print(k)
        print(v)
        break
'''


# parte non utile per il momento, tenuta per utilità futura, presa da import_csv.py
#    print(f"\nIMPORTAZIONE COMPLETATA!")
#    print(f"Archi caricati: {len(archi)}")
#
#    if archi:
#        print(f"Colonne presenti: {list(archi[0].keys())}")
#
#        # Stampa di verifica delle prime 5 righe
#        print("\nPrime 5 righe di esempio:")
#        for arco in archi[:5]:
#            via = arco.get('des_via', arco.get('desvia', 'N/D'))
#            print(f"  → {arco.get('codice', 'N/D')}: {via} - {arco.get('vifraz', 'N/D')} (senso: {arco.get('sensouni', 'N/D')})")
#        if len(archi) > 5:
#            print(f"  ... e altre {len(archi) - 5} righe")
#