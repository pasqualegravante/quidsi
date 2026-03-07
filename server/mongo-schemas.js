const mongoose = require("mongoose");
const validator = require("validator");

const userSchema = new mongoose.Schema({
    name: { type: String },
    surname: { type: String },
    password: {
        type: String,
        required: [true, "Password is a required field."]
    },
    email: {
        type: String,
        required: [true, "Email is a required field."],
        unique: [true, "The given email already exists."]
    },
    profilepic: String,
    settings: {type: Object}
}, {collection:"utente"});
const Users = mongoose.model("Utente", userSchema);

const accessSchema = new mongoose.Schema({
    user_id: { type: mongoose.Types.ObjectId, index: true, ref: 'Utente' },
    token: String,
    access_date: { type: Date, default: Date.now() },
    ipaddr: String
});
accessSchema.set("autoIndex", false);
const Accesses = mongoose.model("Accesses", accessSchema);

// 🔥 NUOVO: Schema per le Pratiche/Scenari
const scenarioSchema = new mongoose.Schema({
    user_id: { type: mongoose.Types.ObjectId, index: true, ref: 'Utente' },
    label: { type: String, default: "Nuovo Scenario" },
    description: { type: String, default: "" },
    closed_segments: { type: [String], default: [] }, // Array di ID degli archi chiusi
    alfa: { type: Number, default: 0.5 },
    created_at: { type: Date, default: Date.now }
}, {collection: "scenario"});
const Scenarios = mongoose.model("Scenario", scenarioSchema);

module.exports = { Users, Accesses, Scenarios };