const router                    = require("express").Router();
const { Scenarios }             = require("../mongo-schemas");

router.post("/get-all", async (req, res)=>{
    result = await Scenarios.find({"user_id":res.locals.user._id});
    
    return res.status(result==null ? 500 : 200).json(result);
});

router.post("/new", async (req, res)=>{
    result = await Scenarios.insertOne({"user_id":res.locals.user._id});
    
    return res.status(result==null ? 500 : 200).json(result);
});

router.post("/update", async (req, res)=>{
    if(req.body.label || req.body.description){
        result = await Scenarios.updateOne({"user_id":res.locals.user._id, "_id":req.body.id});
    }
    
    return res.status(result==null ? 500 : 200).json(result);
});

router.post("/load", async (req, res)=>{
    if(res.locals.cacheCheck){
        return res.json({res:true});
    }

    resulto = await Scenarios.findOne({"user_id":res.locals.user._id, "_id":req.body.id}).exec();
    result = resulto;
    if(result){
        const payload = {
            id:result._id,
            uid:result.user_id,
            closed_segments:result.closed_segments,
            alfa:result.alfa
        }
        console.log(payload, typeof(payload.id))
        /*
        console.log(typeof(result))
        result["id"]=String(result["_id"])
        result["uid"]=String(result["user_id"])
        delete result["user_id"]
        delete result["_id"]*/

        // Chiamata al server Python su porta 8000
        const pyres = await fetch(`${process.env.PYBACKEND}/scenario/load`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!pyres.ok) {

            throw new Error(`Python server error: ${pyres.status}`);
        }

        const data = await pyres.json();
        return res.json(data);
    }
    return res.status(400).send();
});

router.post("/save", async (req, res)=>{
    if(!res.locals.cacheCheck)
        return res.status(200).json({res:true})

    //ask pybackend for cached version to save,
    try {
        // Chiamata al server Python su porta 8000
        const pyres = await fetch(`${process.env.PYBACKEND}/scenario/get-from-cache`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({uid:String(res.locals.user._id), id:req.body.id })
        });

        if (!pyres.ok) {
            throw new Error(`Python server error: ${pyres.status}`);
        }

        const data = await pyres.json();
        result = await Scenarios.updateOne({"_id":scen_id, "user_id":res.locals.user._id}, data).exec();

        return res.status(200).json({res:true});

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Errore comunicazione con motore Python' });
    }
});


router.post("/delete", async (req, res)=>{
    //ask pybackend to delete graph
    result=true
    if(res.locals.cacheCheck)
        //ask pybackend for cached version to save,
        try {
            // Chiamata al server Python su porta 8000
            const pyres = await fetch(`${process.env.PYBACKEND}/scenario/delete-from-cache`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({uid:String(res.locals.user._id), id:req.body.id })
            });

            if (!pyres.ok) {
                throw new Error(`Python server error: ${pyres.status}`);
            }

        } catch (err) {
            result=false
            console.error(err);
            res.status(500).json({ error: 'Errore comunicazione con motore Python' });
        }
    
    //delete from db
    result = (await Scenarios.deleteOne({"_id":req.body?.id, "user_id":res.locals.user._id}).exec()).deletedCount==1 && result;

    return res.json({res:result});
});

module.exports = router