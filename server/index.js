const express = require("express");
const server = express();
const path = require("path");
const PORT = process.env.PORT || 4000;
const { createProxyMiddleware } = require('http-proxy-middleware');
const {authenticate} = require("./middlewares.js")

require("dotenv").config();

/// Server Configuration
server.use(require("cookie-parser")());
server.use(express.json())
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

server.use("/engine", authenticate);
server.use("/engine", createProxyMiddleware({
  target: 'http://127.0.0.1:8000',  // L'indirizzo del servizio target
  changeOrigin: true,               // Cambia l'header Origin per far credere al target che la richiesta provenga dal suo host
  pathRewrite: { '^/': '/engine/' },   // Rimuove il prefisso /engine dalla richiesta inoltrata (opzionale, dipende dal target)
  on:{
  proxyReq: (proxyReq, req, res) => {
    // Modifica il body: usa UID dal token (req.user.uid)
    let body = req.body || {};
    console.log(body)
    console.log(res.locals.user)

    body.uid = res.locals.user._id; // Sovrascrivi o inserisci UID verificato
    const bodyContent = JSON.stringify(body);
    console.log(bodyContent);

    proxyReq.setHeader('Content-Type', 'application/json');
    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyContent));
    proxyReq.write(bodyContent);
    proxyReq.end();
  }}
}
)
);

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
  server.listen(PORT, ()=>{
    console.log(`Server powered on port ${PORT}`);
  });
});
