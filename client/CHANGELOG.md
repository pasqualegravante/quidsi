# Quidsi Client Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] 

## [0.0.0] - 2025-11-18
### Added
* index page showing the map and buttons to interact with it




## 10 - 01 - 2026, Commit "risoluzione race conditions, sync avvio e miglioramenti UX"
Risoluzione bug critici e miglioramento fluidità interfaccia.

Dettaglio modifiche:
- [FIX] Sync Stato: Aggiunto resetAll() in mounted() per allineare Backend e Frontend al refresh pagina.
- [FIX] Race Conditions: Implementato stato `isLoading` per bloccare input concorrenti durante i calcoli.
- [LOGIC] Sequenzialità: `toggleStreet` ora attende il completamento del ricalcolo percorso prima di sbloccare l'UI.
- [UX] Feedback: Aggiunto cursore di attesa (clessidra), spinner di caricamento e disabilitazione controlli.
- [UI] Formattazione: KPI tempi e distanze ora mostrati in formato leggibile (es. "45 sec", "1.2 km").
- [STABILITY] Migliorata gestione errori su percorsi non trovati (404) per evitare crash mappa.

