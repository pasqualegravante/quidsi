const router            = require("express").Router();
const {retrieveHtmlForm}= require("../middlewares");
const bcrypt            = require("bcrypt");
const {Users}           = require("../mongo-schemas");
const {
    user_validator,
    sanitize_object
}  = require("../utils");


/// ROUTER CONFIGURATION

router.get("/user-info", async (req, res)=>{
    try {
        const user = await Users.findById(req.query.id).exec();
        res.send(user);
    } catch (error) {
        console.log(error);
        res.status(500).send("Server error: User retrieving failed.");
    }
})

router.post("/", retrieveHtmlForm,
    async (req, res)=>{
        let UserDetails = new Object();
        Object.keys(res.locals.fields).forEach((key)=>{
            UserDetails[key]=res.locals.fields[key][0];
        });

        UserDetails=sanitize_object(UserDetails, ["password"]);

        user_validator.setUserData(UserDetails);
        if(!(await user_validator.checkall_userdata({checkEmail:true, checkPlainPassword:true}))){
            return res.status(400).send("Client error: User data is not accepted.");
        }

        //password hashing with bcrypt
        const salt = await bcrypt.genSalt(10);
        UserDetails.password = await bcrypt.hash(UserDetails.password, salt);

        try {
            //PRG Pattern applied; 303=response to the request can be found on another URI
            const user = await Users.create(UserDetails);
            res.send("User created successfully.");
        } catch (error) {
            console.log(error);
            res.status(500).send("Server error: User creation failed.");
        }
});

module.exports=router;