const express = require("express");
const server = express();
const path = require("path");
const PORT = process.env.PORT || 4000;
const { createProxyMiddleware } = require('http-proxy-middleware');
const { authenticate } = require("./middlewares.js");
const cors = require("cors");

require("dotenv").config();

server.use(require("cookie-parser")());
server.use(express.json());

server.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

server.use(express.static(path.join(__dirname, '../client/dist')));

server.get("/", (req, res) => res.send("Benvenuto su Quidsi"));
server.use("/login", require("./routes/login"));
server.use("/regist", require("./routes/regist"));

// 🔥 FIX: Scommentate le rotte! Senza queste, niente funziona dopo il login.
server.use("/user", authenticate, require("./routes/user")); 
server.use("/scenarios", authenticate, require("./routes/scenarios")); 

server.get("/home", (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

server.use("/engine", authenticate);
server.use("/engine", createProxyMiddleware({
  target: process.env.PYTHON_URL || 'http://engine:8000',
  changeOrigin: true,
  pathRewrite: { '^/engine': '' },
  on: {
    proxyReq: (proxyReq, req, res) => {
      let body = req.body || {};
      if (res.locals && res.locals.user) {
          body.uid = res.locals.user._id.toString(); 
      }
      const bodyContent = JSON.stringify(body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyContent));
      proxyReq.write(bodyContent);
      
      // 🔥 LA CORREZIONE FONDAMENTALE È QUI SOTTO:
      // Comunica a Python che abbiamo finito di trasmettere il body!
      proxyReq.end(); 
    },
    error: (err, req, res) => {
        console.error("PROXY ERROR:", err.message);
        if (!res.headersSent) res.status(502).send("Motore di calcolo irraggiungibile.");
    }
  }
}));

server.all("*", (req, res) => res.status(404).send("Page not found."));

const mongoose = require("mongoose");
mongoose.connect(process.env.MONGODB_URI, {dbName:"quidsi"});
mongoose.connection.once('open', () => {
  console.log('Connected to MongoDB');
  server.listen(PORT, () => console.log(`Server powered on port ${PORT}`));
});