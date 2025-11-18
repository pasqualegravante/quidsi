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
        const nickname = htmlsanitizer(res.locals.fields.nickname[0]);
        const password = res.locals.fields.password[0];

        const user = await Users.findOne({nickname:nickname}).exec();
        if(!user){
            return res.status(401).send(`Client error: User '${nickname}' doesn't exist. Try to register.`);
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
                algorithm:process.env.JWT_ALG
            }
        );
        console.log(token);
        try {
            await Accesses.findOneAndUpdate({user_id:user._id}, {token:token, access_date:Date.now(), ipaddr:req.ip}, {new:true, upsert:true}).exec();
            //console.log(update_existing_document);
            res.cookie("session_id", token, {httpOnly:true, maxAge:parseInt(process.env.COOKIE_TTL)}).send("Login successful.");
        } catch (error) {
            console.log(`Error during login;\n${error}`);
            res.status(500).send("Server error: login failed.");
        }
});

module.exports=router;