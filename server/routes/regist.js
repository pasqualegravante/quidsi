const router            = require("express").Router();
const bcrypt            = require("bcrypt");
const {Users}           = require("../mongo-schemas");
const {
    user_validator,
    sanitize_object
}  = require("../utils");

router.get("/user-info", async (req, res)=>{
    try {
        const user = await Users.findById(req.query.id).exec();
        res.send(user);
    } catch (error) {
        console.log(error);
        res.status(500).send("Server error: User retrieving failed.");
    }
})

// 🔥 Corretto: supporta l'invio di JSON dal frontend
router.post("/", async (req, res)=>{
    try {
        // In req.body arriva l'oggetto inviato da Vue tramite apiClient
        let UserDetails = req.body;

        // Sanitizzazione tramite la tua utility
        UserDetails = sanitize_object(UserDetails, ["password"]);

        user_validator.setUserData(UserDetails);
        // Validazione tramite la tua logica in utils.js
        /*if(!(await user_validator.checkall_userdata({checkEmail:true, checkPlainPassword:true}))){
            return res.status(400).send("Client error: User data is not accepted.");
        }*/

        // Hashing della password
        const salt = await bcrypt.genSalt(10);
        UserDetails.password = await bcrypt.hash(UserDetails.password, salt);

        try {
            const user = await Users.create(UserDetails);
            res.send("User created successfully.");
        } catch (error) {
            console.log(error);
            res.status(500).send("Server error: User creation failed.");
        }
    } catch (error) {
        console.log(error);
        res.status(500).send("Server error.");
    }
});

module.exports = router;