const express = require("express");
const server = express();
const path = require("path");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const PORT = process.env.PORT || 4000;

// Middleware
server.use(cors({ origin: "*" })); // Permette tutto in sviluppo
server.use(express.json());
server.use(express.static(path.join(__dirname, '../client/dist')));

// --- API ENDPOINTS ---

// Calcolo percorso
server.post("/api/calculate-route", async (req, res) => {
    try {
        const response = await axios.post("http://127.0.0.1:8000/calculate-route", req.body);
        res.json(response.data);
    } catch (err) {
        res.status(err.response?.status || 500).json(err.response?.data || {error: "Server Error"});
    }
});

// Toggle Cantiere
server.post("/api/toggle-closure/:id", async (req, res) => {
    try {
        const response = await axios.post(`http://127.0.0.1:8000/toggle-closure/${req.params.id}`);
        res.json(response.data);
    } catch (err) {
        res.status(500).send("Errore server Python");
    }
});

// Reset Totale
server.post("/api/reset-closures", async (req, res) => {
    const response = await axios.post("http://127.0.0.1:8000/reset-closures");
    res.json(response.data);
});

// SPA routing
server.get("/home", (req, res) => res.sendFile(path.join(__dirname, '../client/dist/index.html')));

server.listen(PORT, () => console.log(`Node Server on port ${PORT}`));