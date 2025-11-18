const express = require("express");
const server = express();
const path = require("path");
const PORT = process.env.PORT || 4000;
require("dotenv").config();

/// Server Configuration
server.use(require("cookie-parser")());
server.use(express.static(path.join(__dirname, '../client/dist')));

//BASE ENDPOINTS
server.get("/", (req, res)=>{
  res.send("Benvenuto su Quidsi")
});
server.use("/login", require("./routes/login"));


//Sbarramento agli endpoints sottostanti tramite middleware

server.get("/home", (req, res)=>{
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
})

server.all("*", (req, res)=>{
    res.status(404).send("Page not found.");
});

server.listen(PORT, ()=>{
    console.log(`Server powered on port ${PORT}`);
});
/// Server Startup con connessione a mongodb
/*
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGODB_URI);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
  server.listen(PORT, ()=>{
    console.log(`Server powered on port ${PORT}`);
  });
});*/
