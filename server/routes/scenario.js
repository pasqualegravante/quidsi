const router = require("express").Router();
const { Scenarios } = require("../mongo-schemas");

// Mantiene il fallback di sicurezza per evitare crash se l'env non è caricato
const getPythonUrl = () => process.env.PYTHON_URL || process.env.PYBACKEND || "http://engine:8000";

router.post("/get-all", async (req, res) => {
    try {
        const result = await Scenarios.find({ "user_id": res.locals.user._id });
        return res.status(200).json(result);
    } catch (error) {
        console.error("Errore get-all:", error);
        return res.status(500).json({ error: "Errore nel recupero scenari" });
    }
});

router.post("/new", async (req, res) => {
    try {
        const newScenario = await Scenarios.create({
            user_id: res.locals.user._id,
            label: "Nuovo Scenario",          
            description: "Descrizione vuota",
            closed_segments: [],
            alfa: 0.5,
            manual_weights: {},
            creation_date: new Date()
        });
        return res.status(200).json(newScenario);
    } catch (error) {
        console.error("Errore creazione scenario:", error);
        return res.status(500).json({ error: "Impossibile creare lo scenario" });
    }
});

router.post("/update", async (req, res)=>{
    try {
        let updateData = {};
        if (req.body.label != undefined ) updateData.label = req.body.label;
        if (req.body.description != undefined ) updateData.description = req.body.description;
        
        // FIX mantenuto: $set è necessario per MongoDB
        if(Object.keys(updateData).length > 0){
            const result = await Scenarios.updateOne(
                { "user_id": res.locals.user._id, "_id": req.body._id },
                { $set: updateData }
            );
            return res.status(200).json(result);
        }
        return res.status(400).json({ error: "Nessun dato fornito per l'aggiornamento" });
    } catch (error) {
        console.error("Errore update:", error);
        return res.status(500).json({ error: "Errore aggiornamento" });
    }
});

router.post("/load", async (req, res)=>{
    try {
        if(res.locals.cacheCheck) return res.json({res:true});

        const result = await Scenarios.findOne({"user_id":res.locals.user._id, "_id":req.body._id}).exec();

        if(result){
            // 🔥 ROLLBACK: Torniamo a usare esplicitamente _id come da requests_model.py
            const payload = {
                _id: String(result._id), 
                user_id: String(result.user_id),
                closed_segments: result.closed_segments || [],
                alfa: result.alfa || 0.5,
                manual_weights: result.manual_weights || {}
            };

            const pyres = await fetch(`${getPythonUrl()}/scenario/load`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!pyres.ok) throw new Error(`Python server error: ${pyres.status}`);

            const data = await pyres.json();
            return res.json(data);
        }
        return res.status(404).send("Scenario non trovato");
    } catch (error) {
        console.error("Errore load:", error);
        return res.status(500).json({ error: "Errore caricamento scenario" });
    }
});

router.post("/save", async (req, res)=>{
    if(!res.locals.cacheCheck) return res.status(200).json({res:true});

    try {
        const pyres = await fetch(`${getPythonUrl()}/scenario/get-from-cache`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: String(res.locals.user._id), 
                _id: String(req.body._id) // 🔥 ROLLBACK a _id
            })
        });

        if (!pyres.ok) throw new Error(`Python server error: ${pyres.status}`);

        const data = await pyres.json();
        
        // Pulizia per sicurezza
        if(data._id) delete data._id;

        await Scenarios.updateOne(
            {"_id": req.body._id, "user_id": res.locals.user._id}, 
            {$set: data}
        ).exec();

        return res.status(200).json({res:true});
    } catch (err) {
        console.error("Errore save:", err);
        res.status(500).json({ error: 'Errore durante il salvataggio' });
    }
});

router.delete("/delete", async (req, res)=>{
    let pyResult = true;
    
    if(res.locals.cacheCheck) {
        try {
            const pyres = await fetch(`${getPythonUrl()}/scenario/delete-from-cache`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: String(res.locals.user._id), 
                    _id: String(req.body._id) // 🔥 ROLLBACK a _id
                })
            });
            if (!pyres.ok) console.warn("Python cache delete fallito o non trovato");
        } catch (err) {
            pyResult = false;
            console.error("Errore eliminazione cache Python:", err);
        }
    }
    
    try {
        const dbResult = await Scenarios.deleteOne({
            "_id": req.body._id, 
            "user_id": res.locals.user._id
        }).exec();
        
        return res.json({ 
            res: dbResult.deletedCount === 1 && pyResult, 
            deleted: dbResult.deletedCount === 1 
        });
    } catch (error) {
        console.error("Errore delete DB:", error);
        return res.status(500).json({ error: "Errore eliminazione database" });
    }
});

module.exports = router;