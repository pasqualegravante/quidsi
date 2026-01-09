const express = require("express");
const server = express();
const path = require("path");
const axios = require("axios");
const cors = require("cors");
const mongoose = require("mongoose"); // Libreria DB
require("dotenv").config();

const PORT = process.env.PORT || 4000;
const PYTHON_URL = process.env.PYTHON_URL || "http://127.0.0.1:8000";
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/quidsi";

// --- CONNESSIONE AL DATABASE ---
mongoose.connect(MONGO_URL)
  .then(() => console.log("✅ Connesso a MongoDB"))
  .catch(err => console.error("❌ Errore MongoDB:", err));

// Definizione dello "Schema" (come sono fatti i dati)
const ScenarioSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    closed_ids: [String], // Lista di ID strade chiuse
    created_at: { type: Date, default: Date.now }
});
const Scenario = mongoose.model("Scenario", ScenarioSchema);

// --- MIDDLEWARE ---
server.use(cors({ origin: "*" }));
server.use(express.json());
server.use(express.static(path.join(__dirname, '../client/dist')));

// --- API PYTHON PROXY ---
// (Queste restano uguali per far funzionare la mappa live)
server.post("/api/calculate-route", async (req, res) => {
    try {
        const response = await axios.post(`${PYTHON_URL}/calculate-route`, req.body);
        res.json(response.data);
    } catch (error) {
        res.status(503).json({ error: "Errore Engine Python" });
    }
});

server.post("/api/toggle-closure/:id", async (req, res) => {
    try {
        const response = await axios.post(`${PYTHON_URL}/toggle-closure/${encodeURIComponent(req.params.id)}`);
        res.json(response.data);
    } catch (error) { res.status(500).json({ error: "Errore Toggle" }); }
});

server.post("/api/reset-closures", async (req, res) => {
    try {
        const response = await axios.post(`${PYTHON_URL}/reset-closures`);
        res.json(response.data);
    } catch (error) { res.status(500).json({ error: "Errore Reset" }); }
});

// --- NUOVE API DATABASE (SCENARI) ---

// 1. Salva uno scenario
server.post("/api/scenarios", async (req, res) => {
    try {
        const { name, closed_ids } = req.body;
        const newScenario = await Scenario.create({ name, closed_ids });
        res.json(newScenario);
        console.log(`Scenario salvato: ${name}`);
    } catch (error) {
        res.status(500).json({ error: "Errore salvataggio DB" });
    }
});

// 2. Ottieni lista scenari
server.get("/api/scenarios", async (req, res) => {
    try {
        const scenarios = await Scenario.find().sort({ created_at: -1 }); // Più recenti prima
        res.json(scenarios);
    } catch (error) {
        res.status(500).json({ error: "Errore lettura DB" });
    }
});

// 3. APPLICA uno scenario (Carica e manda a Python)
server.post("/api/scenarios/:id/apply", async (req, res) => {
    try {
        // A. Trova lo scenario nel DB
        const scenario = await Scenario.findById(req.params.id);
        if (!scenario) return res.status(404).json({ error: "Scenario non trovato" });

        console.log(`Applicazione scenario: ${scenario.name} (${scenario.closed_ids.length} strade)`);

        // B. Resetta Python (tabula rasa)
        await axios.post(`${PYTHON_URL}/reset-closures`);

        // C. Riapplica le chiusure una per una
        // (Nota: in produzione si farebbe un endpoint bulk, ma così è più semplice ora)
        for (const roadId of scenario.closed_ids) {
            await axios.post(`${PYTHON_URL}/toggle-closure/${encodeURIComponent(roadId)}`);
        }

        res.json({ message: "Scenario applicato con successo", scenario });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Errore applicazione scenario" });
    }
});

// 4. Elimina scenario
server.delete("/api/scenarios/:id", async (req, res) => {
    await Scenario.findByIdAndDelete(req.params.id);
    res.json({ message: "Eliminato" });
});

// --- ROUTING FRONTEND ---
server.all("*", (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    } else {
        res.status(404).json({ error: "API non trovata" });
    }
});

server.listen(PORT, () => {
    console.log(`SERVER CON DB ATTIVO SU PORTA: ${PORT}`);
});