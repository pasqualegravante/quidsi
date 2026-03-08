const express = require("express");
const server = express();
const path = require("path");
const cors = require("cors");
const PORT = process.env.PORT || 4000;
const {authenticate, checkScenarioCache, sanitizeBody} = require("./middlewares.js")

require("dotenv").config();
server.use(cors({ origin: "http://localhost:5173", credentials: true }));

/// Server Configuration
server.use(require("cookie-parser")());
server.use(express.json())
server.use(express.static(path.join(__dirname, '../client/dist')));

//BASE ENDPOINTS
server.get("/", (req, res)=>{
  res.send("Benvenuto su Quidsi")
});
server.use("/login", require("./routes/login"));
server.use("/regist", require("./routes/regist"));

//Sbarramento agli endpoints sottostanti tramite middleware

server.get("/home", (req, res)=>{
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
})

server.use("/engine", authenticate, sanitizeBody, checkScenarioCache);
server.use("/engine", require("./routes/engine.js"));

server.all("*", (req, res)=>{
    res.status(404).send("Page not found.");
});

/*
server.listen(PORT, ()=>{
    console.log(`Server powered on port ${PORT}`);
});*/
/// Server Startup con connessione a mongodb

const mongoose = require("mongoose");
mongoose.connect(process.env.MONGODB_URI, {dbName:"quidsi"});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
  server.listen(PORT, '0.0.0.0', ()=>{
    console.log(`Server powered on port ${PORT}`);
  });
});
