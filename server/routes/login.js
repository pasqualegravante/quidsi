const router            = require("express").Router();
const {retrieveHtmlForm}= require("../middlewares");
const bcrypt            = require("bcrypt");
const htmlsanitizer     = require("sanitize-html");
const jwt               = require("jsonwebtoken");
const {Users, Accesses} = require("../mongo-schemas");

router.get("/", (req, res)=>{
    res.send("login page");
});

router.post("/", retrieveHtmlForm,
    async (req,res)=>{
        const email = htmlsanitizer(res.locals.fields.email[0]);
        const password = res.locals.fields.password[0];
        
        const user = await Users.findOne({email:email}).exec();
        if(!user){
            return res.status(401).send(`Client error: User '${email}' doesn't exist. Try to register.`);
        }
        
        const is_correct_password = await bcrypt.compare(password, user.password);
        if(!is_correct_password){
            return res.status(401).send(`Client error: Password incorrect.`);
        }

        const token = jwt.sign(
            {
                sub: user._id,
                iat:Date.now(),
                exp:Date.now()+parseInt(process.env.COOKIE_TTL)
            },
            process.env.JWT_SECRET,
            {
                algorithm:process.env.JWT_ALG || "HS256"
            }
        );
        console.log(token);
        try {
            await Accesses.findOneAndUpdate(
                {user_id: user._id}, 
                {token: token, access_date: Date.now(), ipaddr: req.ip}, 
                {new: true, upsert: true}
            ).exec();
            
            // 🔥 FIX 1: Diamo un tempo di vita (TTL) di default di 24 ore se l'env fallisce
            const cookieTTL = parseInt(process.env.COOKIE_TTL) || 86400000; 
            
            // 🔥 FIX 2: Impostazioni "Lax" e "Path" per far digerire il cookie a Opera su Localhost
            res.cookie("session_id", token, {
                httpOnly: true, 
                maxAge: cookieTTL,
                path: '/',          // Il cookie vale per tutte le rotte!
                sameSite: 'Lax'     // Permette il cross-origin su localhost in HTTP
            }).send("Login successful.");

        } catch (error) {
            console.log(`Error during login;\n${error}`);
            res.status(500).send("Server error: login failed.");
        }
    });
module.exports=router;