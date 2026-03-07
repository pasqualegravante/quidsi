const router = require("express").Router();
const { Scenarios } = require("../mongo-schemas");

// 1. GET /scenarios - Ottieni tutti gli scenari dell'utente
router.get("/", async (req, res) => {
    try {
        const uid = res.locals.user._id;
        const scenari = await Scenarios.find({ user_id: uid }).sort({ created_at: -1 });
        
        // Mappiamo per il frontend
        const formattati = scenari.map(s => ({ 
            id: s._id, 
            label: s.label, 
            description: s.description 
        }));
        res.json({ scenarios: formattati });
    } catch (error) {
        console.error("Errore recupero scenari:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// 2. GET /scenarios/:id - Seleziona uno scenario specifico
router.get("/:id", async (req, res) => {
    try {
        const scenario = await Scenarios.findOne({ _id: req.params.id, user_id: res.locals.user._id });
        if (!scenario) return res.status(404).json({ error: "Scenario non trovato" });
        
        res.json({ 
            scenario: { 
                id: scenario._id, 
                label: scenario.label, 
                description: scenario.description, 
                closed_segments: scenario.closed_segments, 
                alfa: scenario.alfa 
            } 
        });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// 3. POST /scenarios - Crea una nuova pratica
router.post("/", async (req, res) => {
    try {
        const newScen = await Scenarios.create({
            user_id: res.locals.user._id,
            label: "Nuovo Scenario " + Math.floor(Math.random() * 1000)
        });
        res.json({ scen: { id: newScen._id, label: newScen.label } });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// 4. PUT /scenarios/:id - Aggiorna solo Titolo e Descrizione
router.put("/:id", async (req, res) => {
    try {
        const { label, description } = req.body;
        await Scenarios.findOneAndUpdate(
            { _id: req.params.id, user_id: res.locals.user._id },
            { label, description }
        );
        res.json({ updated: true });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// 5. POST /scenarios/:id/save - SALVATAGGIO DALLA CACHE PYTHON
// 5. POST /scenarios/:id/save - SALVATAGGIO DALLA CACHE PYTHON
router.post("/:id/save", async (req, res) => {
    try {
        const uidStr = res.locals.user._id.toString();
        const scenId = req.params.id;

        // 🔥 FIX DOCKER: Puntiamo a 'engine' invece che a '127.0.0.1'
        const pyUrl = process.env.PYTHON_URL || 'http://engine:8000';
        const pyRes = await fetch(`${pyUrl}/scenario/get-from-cache`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: uidStr, id: scenId })
        });

        if (pyRes.ok) {
            const data = await pyRes.json();
            await Scenarios.findOneAndUpdate(
                { _id: scenId, user_id: res.locals.user._id },
                { closed_segments: data.closed_segments || [], alfa: data.alfa || 0.5 }
            );
        }
        res.json({ saved: true });
    } catch (error) {
        console.error("Errore salvataggio:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// 6. POST /scenarios/:id/duplicate - Duplica una pratica
router.post("/:id/duplicate", async (req, res) => {
    try {
        const original = await Scenarios.findOne({ _id: req.params.id, user_id: res.locals.user._id });
        if (!original) return res.status(404).json({ error: "Not found" });
        
        const copy = await Scenarios.create({
            user_id: res.locals.user._id,
            label: original.label + " (Copia)",
            description: original.description,
            closed_segments: original.closed_segments,
            alfa: original.alfa
        });
        res.json({ scen: { id: copy._id } });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// 7. DELETE /scenarios/:id - Elimina una pratica
router.delete("/:id", async (req, res) => {
    try {
        await Scenarios.findOneAndDelete({ _id: req.params.id, user_id: res.locals.user._id });
        
        // 🔥 FIX DOCKER: Puntiamo a 'engine'
        const pyUrl = process.env.PYTHON_URL || 'http://engine:8000';
        fetch(`${pyUrl}/scenario/delete-from-cache`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: res.locals.user._id.toString(), id: req.params.id })
        }).catch(() => {});

        res.json({ deleted: true });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;