const router                    = require("express").Router();
const router_scenario           = require("./scenario");
const { createProxyMiddleware } = require('http-proxy-middleware');

router.use("/scenario", router_scenario);

router.use(["/compute/*", "/edge/*"],
    createProxyMiddleware({
    target: 'http://127.0.0.1:8000',  // L'indirizzo del servizio target
    pathRewrite: (path, req) => req.originalUrl.replace('/engine', ''),   // Rimuove il prefisso /engine dalla richiesta inoltrata (opzionale, dipende dal target)
    changeOrigin: true,               // Cambia l'header Origin per far credere al target che la richiesta provenga dal suo host
    
    on:{
    proxyReq: (proxyReq, req, res) => {
        console.log(req.url)
        // Modifica il body: usa UID dal token (req.user.uid)
        let body = req.body || {};
        //console.log(body)
        //console.log(res.locals.user)

        body.user_id = res.locals.user._id; // Sovrascrivi o inserisci UID verificato
        const bodyContent = JSON.stringify(body);
        //console.log(bodyContent);

        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyContent));
        proxyReq.write(bodyContent);
        proxyReq.end();
    }}
    }
));

module.exports=router