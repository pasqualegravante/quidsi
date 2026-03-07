const jwt           = require("jsonwebtoken");
const {formidable}  = require("formidable");
const {Users}       = require("./mongo-schemas");
const {fetch}            = require("undici");
const authenticate = async (req, res, next) => {
    const token = req.cookies.session_id;
    //console.log(token);
    
    try {
        const payload = await jwt.verify(
            token,
            process.env.JWT_SECRET,
            {algorithms: process.env.JWT_ALG},
            (err, token)=>{
                if(err)
                    throw err;

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
}

/**
 * @param {*} req 
 * @param {*} res 
 * @param {*} next
 * Retrieves html form and saves data in res.locals.fields and res.locals.files
 */
const retrieveHtmlForm = (req, res, next)=>{
    const form = formidable({});
    
    form.parse(req, (err, fields, files)=>{
        if(err){
            console.log(err);
            res.status(500).send("Server error: Obtaining form data failed.");//fix error, not always 500, can be also 400
        }
        else{
            res.locals.fields=fields;
            res.locals.files=files;
            next();
        }
    });
}

const checkScenarioCache = async (req, res, next) => {
    // Estrai scen_id in base al tuo routing
    let scen_id = req.body?.id;

    if (!scen_id) {
        return res.status(400).json({ error: 'scen_id mancante' });
    }

    const uid = res.locals.user?._id;  // supponendo JWT middleware precedente
    if (!uid) {
        return res.status(400).json({ error: 'user_id mancante' });
    }

    try {
        const cacheCheck = await fetch(`${process.env.PYBACKEND}/scenario/is-in-cache`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'  // FIX PRINCIPALE: aggiungi questo!
            },
            body:JSON.stringify({
                id:scen_id,
                uid:String(uid)
            }),
            signal: AbortSignal.timeout(500)               // timeout basso: è solo un check
        });

        if (!cacheCheck.ok) {
            console.log(cacheCheck)
            throw new Error(`Cache check fallito: ${cacheCheck.status}`);
        }
        
        const in_cache = await cacheCheck.json();
        //console.log(in_cache, cacheCheck.body)
        if (in_cache) {
            console.log(in_cache, typeof(in_cache))
            if(in_cache?.res=="true")
                res.locals.cacheCheck=true;
            else
                res.locals.cacheCheck=false;

            return next();
        }

        // Alternativa più aggressiva: forza load (se hai endpoint /scenario/load)
        /*
        await fetch(`${PYTHON_URL}/scenario/load`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scen_id, uid })
        });
        // poi next() dopo 200-500 ms di sleep se serve
        */

    } catch (err) {
        console.error('[Cache Check]', err.message);
        // Decidi: fail-open o fail-closed
        // fail-open (continua comunque, Python gestirà il caricamento)
        res.status(503).json({ error: 'Motore di calcolo non pronto' });
    }
}

const sanitizeBody = async (req, res, next) => {
    next()
}

module.exports = { authenticate, retrieveHtmlForm, checkScenarioCache, sanitizeBody };