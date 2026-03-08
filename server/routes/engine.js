const router                    = require("express").Router();
const router_scenario           = require("./scenario");
const { createProxyMiddleware } = require('http-proxy-middleware');

// 🔥 FIX: Definiamo l'URL dinamico corretto per raggiungere il container Python in Docker
const getPythonUrl = () => process.env.PYTHON_URL || process.env.PYBACKEND || "http://engine:8000";

router.use("/scenario", router_scenario);

router.use(["/compute/*", "/edge/*"],
    createProxyMiddleware({
    target: getPythonUrl(),  // 🔥 FIX: Usiamo l'indirizzo dinamico invece di 127.0.0.1
    pathRewrite: (path, req) => req.originalUrl.replace('/engine', ''),   
    changeOrigin: true,               
    
    on:{
    proxyReq: (proxyReq, req, res) => {
        console.log(req.url)
        
        let body = req.body || {};

        body.user_id = res.locals.user._id;
        const bodyContent = JSON.stringify(body);

        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyContent));
        proxyReq.write(bodyContent);
        proxyReq.end();
    }}
    }
));

module.exports=router;