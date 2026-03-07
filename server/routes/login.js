const router            = require("express").Router();
const bcrypt            = require("bcrypt");
const htmlsanitizer     = require("sanitize-html");
const jwt               = require("jsonwebtoken");
const {Users, Accesses} = require("../mongo-schemas");

router.post("/", async (req,res)=>{ // 🔥 Rimosso retrieveHtmlForm
    try {
        // 🔥 Leggiamo dal body JSON inviato da Vue
        const email = htmlsanitizer(req.body.email || "");
        const password = req.body.password || "";

        const user = await Users.findOne({email:email}).exec();
        if(!user) return res.status(401).send("Utente non trovato.");
        
        const is_correct_password = await bcrypt.compare(password, user.password);
        if(!is_correct_password) return res.status(401).send("Password errata.");

        const token = jwt.sign(
            { sub: user._id, iat: Date.now(), exp: Date.now() + 3600000 },
            process.env.JWT_SECRET || "segreto",
            { algorithm: 'HS256' }
        );
        
        await Accesses.findOneAndUpdate({user_id:user._id}, {token:token, access_date:Date.now(), ipaddr:req.ip}, {new:true, upsert:true}).exec();
        
        res.cookie("session_id", token, {httpOnly:true, maxAge: 3600000});
        
        // 🔥 Mandiamo il JSON al frontend
        res.json({
            token: token,
            user: { id: user._id, email: user.email, name: user.name }
        });
    } catch (error) {
        res.status(500).send("Errore server.");
    }
});

module.exports=router;