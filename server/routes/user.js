const router = require("express").Router();
const { Users, Accesses } = require("../mongo-schemas");
const bcrypt = require("bcrypt");
const { user_validator, sanitize_object } = require("../utils");

router.get("/", async (req, res) => {
    let user = res.locals.user;
    if (user) res.send(user);
    else res.status(404).send(`User not found.`);
});

// 🔥 FIX: Rimosso retrieveHtmlForm, usa JSON
router.post("/edit", async (req, res) => {
    try {
        let user = res.locals.user;
        let payload = sanitize_object(req.body, []);

        user.name = payload.name || user.name;
        user.surname = payload.surname || user.surname;
        
        user_validator.setUserData(user);
        const valid_infos = await user_validator.checkall_userdata({ checkEmail: false, checkPlainPassword: false });

        if (!valid_infos) return res.status(400).send("Dati non validi.");

        const updated_user = await Users.findByIdAndUpdate(user._id, {
            name: user.name,
            surname: user.surname
        }, { new: true }).exec();

        updated_user ? res.send(updated_user) : res.status(500).send("Modifica fallita.");
    } catch (error) {
        res.status(500).send("Errore interno del server.");
    }
});

// 🔥 FIX: Cambio password via JSON
router.post("/change-password", async (req, res)=>{
    try {
        const old_password = req.body.old_password;
        const new_password = req.body.new_password;
        const confirm = req.body.confirm;

        const is_old_password_correct = await bcrypt.compare(old_password, res.locals.user.password);
        if(!is_old_password_correct) return res.status(401).send("Vecchia password errata.");

        if(old_password === new_password) return res.status(400).send("La nuova password deve essere diversa dalla vecchia.");
        if(new_password !== confirm) return res.status(400).send("Le password non coincidono.");
        
        const salt = await bcrypt.genSalt(10);
        const hashed_password = await bcrypt.hash(new_password, salt);

        const user_updated = await Users.findByIdAndUpdate(res.locals.user._id, {password: hashed_password}).exec();
        user_updated ? res.send("Password modificata.") : res.status(500).send("Errore nella modifica.");
    } catch (error) {
        res.status(500).send("Errore server.");
    }
});

module.exports = router;