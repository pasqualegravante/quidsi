const jwt           = require("jsonwebtoken");
const {formidable}  = require("formidable");
const {Users}       = require("./mongo-schemas");

/*const authenticate = async (req, res, next) => {
    const token = req.cookies?.session_id;
    
    if (!token) {
        return res.status(401).json({ error: "Client error: Authentication token missing. Please log in." });
    }

    try {
        const payload = await jwt.verify(
            token,
            process.env.JWT_SECRET,
            {algorithms: process.env.JWT_ALG},
            (err, token)=>{
                if(err) throw err;
                return token;
            }
        );

        if(payload.exp<Date.now())
            throw new jwt.TokenExpiredError("Token expired", new Date(payload.exp));

        const user = await Users.findById(payload.sub).exec();
        if(!user)
            throw new Error("No user found with this token.");
        
        res.locals.user=user;
        next();
    } catch (error) {
        console.log(error);
        res.status(401).send("Client error: Authentication failed. Try to login again.");
    }
}*/
const authenticate = async (req, res, next) => {
    // 🔥 BYPASS DI EMERGENZA PER LO SVILUPPO LOCALE 🔥
    // Assegniamo un utente "fantoccio" per far funzionare le chiamate al DB e a Python
    res.locals.user = {
        _id: "69acf6d9fb394c0ba1beacb2", // Usa l'ID che ha già popolato il tuo DB
        nickname: "DevMode",
        email: "bypass@test.it"
    };
    
    // Passiamo subito il controllo alla rotta successiva, saltando il controllo del cookie
    return next();
    
    /* Tutto il vecchio codice (jwt.verify, req.cookies.session_id, ecc.) 
       lo puoi eliminare o lasciare commentato qui sotto per quando andrai in produzione.
    */
}

const retrieveHtmlForm = (req, res, next)=>{
    const form = formidable({});
    
    form.parse(req, (err, fields, files)=>{
        if(err){
            console.log(err);
            res.status(500).send("Server error: Obtaining form data failed.");
        }
        else{
            res.locals.fields=fields;
            res.locals.files=files;
            next();
        }
    });
}

const checkScenarioCache = async (req, res, next) => {
    // 🔥 FIX: Dobbiamo cercare rigorosamente _id, non id!
    let scen_id = req.body?._id;

    if (!scen_id) {
        return next();
    }

    const uid = res.locals.user?._id;  
    if (!uid) {
        return res.status(400).json({ error: 'user_id mancante' });
    }

    try {
        const pyUrl = process.env.PYTHON_URL || process.env.PYBACKEND || "http://engine:8000";
        const cacheCheck = await fetch(`${pyUrl}/scenario/is-in-cache`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' 
            },
            // 🔥 ROLLBACK: Invia rigorosamente _id a Python
            body:JSON.stringify({
                _id: String(scen_id),
                user_id: String(uid)
            }),
            signal: AbortSignal.timeout(500)               
        });

        if (!cacheCheck.ok) {
            console.log(cacheCheck)
            throw new Error(`Cache check fallito: ${cacheCheck.status}`);
        }
        
        const in_cache = await cacheCheck.json();
        if (in_cache) {
            if(in_cache?.res=="true")
                res.locals.cacheCheck=true;
            else
                res.locals.cacheCheck=false;

            return next();
        }

    } catch (err) {
        console.error('[Cache Check]', err.message);
        res.status(503).json({ error: 'Motore di calcolo non pronto' });
    }
}

const sanitizeBody = async (req, res, next) => {
    next()
}

module.exports = { authenticate, retrieveHtmlForm, checkScenarioCache, sanitizeBody };