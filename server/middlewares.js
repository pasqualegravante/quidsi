const jwt           = require("jsonwebtoken");
const {formidable}  = require("formidable");
const {Users}       = require("./mongo-schemas");

const authenticate = async (req, res, next) => {
    const token = req.cookies.session_id;
    //console.log(token);
    
    try {
        const payload = await jwt.verify(
            token,
            process.env.JWT_SECRET,
            {algorithms: process.env.JWT_ALG},
            (err, token)=>{
                if(err)
                    throw err;

                return token;
            }
        );

        if(payload.exp<Date.now())
            throw new jwt.TokenExpiredError("Token expired", new Date(payload.exp));

        const user = await Users.findById(payload.sub).exec();
        if(!user)
            throw new Error("No user found with this token.");
        
        res.locals.user=user;
        next();
    } catch (error) {
        console.log(error);
        res.status(401).send("Client error: Authentication failed. Try to login again.");
    }
}

/**
 * @param {*} req 
 * @param {*} res 
 * @param {*} next
 * Retrieves html form and saves data in res.locals.fields and res.locals.files
 */
const retrieveHtmlForm = (req, res, next)=>{
    const form = formidable({});
    
    form.parse(req, (err, fields, files)=>{
        if(err){
            console.log(err);
            res.status(500).send("Server error: Obtaining form data failed.");//fix error, not always 500, can be also 400
        }
        else{
            res.locals.fields=fields;
            res.locals.files=files;
            next();
        }
    });
}
module.exports = { authenticate, retrieveHtmlForm };