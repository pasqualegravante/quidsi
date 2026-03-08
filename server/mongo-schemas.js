const mongoose = require("mongoose");
const validator = require("validator");
const userSchema = new mongoose.Schema({
    name: { type: String/*, required: [true, "Name is a required field."]*/},
    surname: { type: String/*, required: [true, "Surname is a required field."]*/},
    password: {
        type: String,
        required: [true, "Password is a required field."]/*,
        validate(value) {
            if (typeof value !== 'string') {
                throw new Error("Password must be a string");
            }
            let error = "";
            if (value.length < 6 || value.length > 20) {
                error += "- Password must be between 6 and 20 characters long\n";
            }
            if (!/[a-z]/.test(value)) {
                error += "- Password must contain at least one lowercase character\n";
            }
            if (!/[A-Z]/.test(value)) {
                error += "- Password must contain at least one uppercase character\n";
            }
            if (!/[0-9]/.test(value)) {
                error += "- Password must contain at least one digit\n";
            }
            if (!/[^A-Za-z0-9]/.test(value)) {
                error += "- Password must contain at least one special character\n";
            }

            if (error !== "") {
                throw new Error("Password must respect these conditions:\n" + error);
            }
        }*/
    },
    email: {
        type: String,
        required: [true, "Email is a required field."],
        unique: [true, "The given email already exists."],
        /*validate(value) {
            if (!validator.isEmail(value))
                throw new Error("Please enter a valid e-mail.");
        }*/
    },
    //birth: { type: Date, required: [true, "Birth is a required field."] },
    profilepic: String,
    settings: {type: Object}
}, {collection:"utente"});
const Users = mongoose.model("Utente", userSchema);

////////

const accessSchema = new mongoose.Schema({
    user_id: { type: mongoose.Types.ObjectId, index: true, ref: 'User' },
    token: String,
    access_date: { type: Date, default: Date.now() },
    ipaddr: String
});
accessSchema.set("autoIndex", false);
const Accesses = mongoose.model("Accesses", accessSchema);

////////

const scenarioSchema = new mongoose.Schema({
    user_id: { type: mongoose.Types.ObjectId, index: true, ref: 'User' },
    label: { type: String, default: "Senza titolo"},
    description: { type: String, default: "(vuoto)" },
    creation_date: { type: Date, default: Date.now() },
    access_date: { type: Date, default: Date.now() },
    closed_segments: { type: [String], default: [] },
    alfa: { type: mongoose.Types.Double, default: 0.5 },
    manual_weights: { type: Map, of:mongoose.Types.Double, default: {} },
});
const Scenarios = mongoose.model("Scenario", scenarioSchema);
module.exports = { Users, Accesses, Scenarios};
