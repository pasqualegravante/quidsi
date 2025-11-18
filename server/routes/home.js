const express = require("express");
const router  = express.Router();

router.get("/", (req, res)=>{
    res.send("Quidsi Home.");
});

module.exports=router;
