const express = require("express");
const axios = require("axios");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = 4000;
// URL interni alla rete Docker
const PYTHON_URL = process.env.PYTHON_URL || "http://engine:8000";
const MONGO_URL = process.env.MONGO_URL || "mongodb://database:27017/quidsi";

// --- CONNESSIONE DATABASE ---
mongoose.connect(MONGO_URL)
  .then(() => console.log("[INFO] MongoDB Connesso"))
  .catch(e => console.error("[ERRORE] Connessione DB:", e));

// Schema per salvare gli scenari
const Scenario = mongoose.model("Scenario", new mongoose.Schema({
    name: String,
    closed_ids: [String], // Lista ID strade chiuse
    created_at: { type: Date, default: Date.now }
}));

// Middleware base
app.use(cors()); // Permette richieste da origini diverse
app.use(express.json()); // Parsa i body JSON
app.use(express.static(path.join(__dirname, '../client/dist'))); // Serve il frontend compilato

// --- FUNZIONE PROXY ---
// Inoltra le richieste dal Frontend al motore Python e gestisce gli errori
const proxy = async (endpoint, req, res) => {
    try {
        const r = await axios.post(`${PYTHON_URL}${endpoint}`, req.body || {});
        res.json(r.data);
    } catch (e) {
        if (e.response) res.status(e.response.status).json(e.response.data);
        else res.status(500).json({ error: "Errore comunicazione con Engine Python" });
    }
};

// --- ROTTE PROXY (Verso Python) ---
app.post("/api/calculate-route", (req, res) => proxy("/calculate-route", req, res));
app.post("/api/calculate-isochrone", (req, res) => proxy("/calculate-isochrone", req, res));
app.post("/api/reset-closures", (req, res) => proxy("/reset-closures", req, res));

app.post("/api/toggle-closure/:id", async (req, res) => {
    try {
        const r = await axios.post(`${PYTHON_URL}/toggle-closure/${encodeURIComponent(req.params.id)}`);
        res.json(r.data);
    } catch (e) { res.status(500).json({ error: "Errore Toggle" }); }
});

// --- ROTTE DATABASE (Scenari) ---
app.get("/api/scenarios", async (req, res) => res.json(await Scenario.find().sort({created_at: -1})));
app.post("/api/scenarios", async (req, res) => res.json(await Scenario.create(req.body)));

app.delete("/api/scenarios/:id", async (req, res) => {
    await Scenario.findByIdAndDelete(req.params.id);
    res.json({status: "ok"});
});

// Logica per APPLICARE uno scenario
// 1. Legge lo scenario dal DB
// 2. Ordina a Python di resettare tutto
// 3. Ordina a Python di chiudere le strade una per una
app.post("/api/scenarios/:id/apply", async (req, res) => {
    const s = await Scenario.findById(req.params.id);
    if (!s) return res.status(404).json({error: "Scenario non trovato"});
    
    await axios.post(`${PYTHON_URL}/reset-closures`);
    for (const id of s.closed_ids) {
        await axios.post(`${PYTHON_URL}/toggle-closure/${encodeURIComponent(id)}`);
    }
    res.json({message: "Applicato", scenario: s});
});

app.listen(PORT, () => console.log(`[INFO] Server Node avviato su porta ${PORT}`));