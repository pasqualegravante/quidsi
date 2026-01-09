const express = require("express");
const server = express();
const path = require("path");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const PORT = process.env.PORT || 4000;

// --- CONFIGURAZIONE INTELLIGENTE (DOCKER VS LOCALHOST) ---
// Se siamo in Docker (tramite docker-compose), userà "http://engine:8000"
// Se siamo in locale, userà "http://127.0.0.1:8000"
const PYTHON_URL = process.env.PYTHON_URL || "http://127.0.0.1:8000";

// --- MIDDLEWARE ---
server.use(cors({ origin: "*" })); // Permette connessioni da qualsiasi origine (utile per Docker/Dev)
server.use(express.json());        // Per leggere i JSON in arrivo
server.use(express.static(path.join(__dirname, '../client/dist'))); // Serve i file statici di Vue

// --- API ROUTES (PROXY VERSO PYTHON) ---

/**
 * 1. Calcolo del Percorso
 * Inoltra la richiesta al motore Python.
 */
server.post("/api/calculate-route", async (req, res) => {
    try {
        console.log(`[NODE] Richiesta calcolo verso: ${PYTHON_URL}/calculate-route`);
        
        const response = await axios.post(`${PYTHON_URL}/calculate-route`, req.body);
        res.json(response.data);
        
    } catch (error) {
        console.error("[NODE] Errore connessione Python:", error.message);
        // Se Python è giù, diamo un errore chiaro
        res.status(503).json({ 
            error: "Il motore di calcolo non è raggiungibile.",
            details: error.message 
        });
    }
});

/**
 * 2. Gestione Chiusura Strada
 * Inoltra l'ID della strada da chiudere/aprire.
 */
server.post("/api/toggle-closure/:id", async (req, res) => {
    try {
        // encodeURIComponent è importante se l'ID contiene spazi o caratteri speciali
        const roadId = encodeURIComponent(req.params.id);
        const targetUrl = `${PYTHON_URL}/toggle-closure/${roadId}`;
        
        console.log(`[NODE] Toggle chiusura su: ${targetUrl}`);
        
        const response = await axios.post(targetUrl);
        res.json(response.data);
        
    } catch (error) {
        console.error("[NODE] Errore toggle:", error.message);
        res.status(500).json({ error: "Errore nell'aggiornamento dello scenario." });
    }
});

/**
 * 3. Reset Totale
 * Riapre tutte le strade.
 */
server.post("/api/reset-closures", async (req, res) => {
    try {
        const response = await axios.post(`${PYTHON_URL}/reset-closures`);
        res.json(response.data);
    } catch (error) {
        console.error("[NODE] Errore reset:", error.message);
        res.status(500).json({ error: "Errore nel reset." });
    }
});

// --- FRONTEND ROUTING ---

// Rotta di benvenuto API
server.get("/", (req, res) => {
    res.send("QuidSI API Gateway è attivo.");
});

// Gestione SPA (Single Page Application)
// Qualsiasi richiesta che non sia /api/... viene gestita da Vue (index.html)
server.all("*", (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    } else {
        res.status(404).json({ error: "Endpoint API non trovato." });
    }
});

// --- AVVIO SERVER ---
server.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`NODE SERVER ATTIVO SULLA PORTA: ${PORT}`);
    console.log(`COLLEGATO AL MOTORE PYTHON SU:  ${PYTHON_URL}`);
    console.log(`=================================================`);
});