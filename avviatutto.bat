@echo off
echo ==========================================
echo AVVIO SISTEMA QUIDSI (Frontend + Backend + Engine)
echo ==========================================

:: 1. Avvia il Motore Python (Porta 8000)
start "QuidSI - ENGINE PYTHON" cmd /k "cd engine && python main.py"

:: 2. Aspetta 2 secondi per sicurezza
timeout /t 2 /nobreak >nul

:: 3. Avvia il Server Node (Porta 4000)
start "QuidSI - SERVER NODE" cmd /k "cd server && npm start"

:: 4. Avvia il Client Vue (Porta 5173)
start "QuidSI - CLIENT VUE" cmd /k "cd client && npm run dev"

echo Tutto avviato! Puoi ridurre a icona questa finestra.