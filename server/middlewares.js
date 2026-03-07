const jwt           = require("jsonwebtoken");
const {formidable}  = require("formidable");
const {Users}       = require("./mongo-schemas");

const authenticate = async (req, res, next) => {
    // 🔥 FIX: Cerca il token sia nei cookie che nell'header Bearer
    let token = req.cookies?.session_id;
    if (!token && req.headers['authorization']) {
        token = req.headers['authorization'].split(' ')[1];
    }
    
    if (!token) return res.status(401).send("Nessun token di accesso fornito.");
    
    try {
        const payload = await jwt.verify(
            token,
            process.env.JWT_SECRET || "segreto",
            {algorithms: process.env.JWT_ALG || 'HS256'}
        );

        if(payload.exp < Date.now())
            throw new jwt.TokenExpiredError("Token expired", new Date(payload.exp));

        const user = await Users.findById(payload.sub).exec();
        if(!user)
            throw new Error("Utente non trovato nel database.");
        
        res.locals.user = user;
        next();
    } catch (error) {
        console.log("Errore Autenticazione:", error.message);
        res.status(401).send("Autenticazione fallita. Effettua nuovamente il login.");
    }
}

const retrieveHtmlForm = (req, res, next)=>{
    const form = formidable({});
    form.parse(req, (err, fields, files)=>{
        if(err){
            console.log(err);
            res.status(500).send("Server error: Obtaining form data failed.");
        } else {
            res.locals.fields=fields;
            res.locals.files=files;
            next();
        }
    });
}
module.exports = { authenticate, retrieveHtmlForm };