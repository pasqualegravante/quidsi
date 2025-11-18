const htmlsanitizer     = require("sanitize-html");
const {Users}           = require("./mongo-schemas");

/**
 * Provide a user object or use single functions
 */
const user_validator = {
    ud:{},
    setUserData: user_data=>ud=user_data,

    empty_field_checker: (object=ud)=>{
        Object.keys(object).forEach((k)=>{
            if((ud[k]+"").length==0) return false;
        });
        return true;
    },

    plain_password_checker: (password=ud?.password)=>{
        let flag = true;

        if (password.length < 6 || password.length > 20) {
            flag=false;
        }
        if (!/[a-z]/.test(password)) {
            flag=false;
        }
        if (!/[A-Z]/.test(password)) {
            flag=false;
        }
        if (!/[0-9]/.test(password)) {
            flag=false;
        }
        if (!/[^A-Za-z0-9]/.test(password)) {
            flag=false;
        }

        return flag;
    },

    email_checker: async (email=ud?.email)=>{
        //previous email regex(more restrective): ^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$
        return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$$/.test(email) && !(await Users.findOne({email:email}).exec());
    },

    birth_checker: (birth=ud?.birth)=>{
        const birth_date = new Date(birth);

        const birthMin16yo = new Date();
        birthMin16yo.setFullYear(birthMin16yo.getFullYear()-16);
        const birthMax120yo = new Date();
        birthMax120yo.setFullYear(birthMax120yo.getFullYear()-120);

        //matching pattern dddd-dd-dd where d is a digit && date is an actual valid one && user is at least 16yo && user is not above 120 yo
        return /^\d{4}-{1}\d{2}-{1}\d{2}$/.test(birth) && !isNaN(new Date(birth).getTime()) && birth_date<=birthMin16yo && birth_date>=birthMax120yo;
    },

    name_surname_checker: (name=ud?.name, surname=ud?.surname)=>{
        //name and surname must contain only alphabet letters and be at least 3 chars long
        return /^[A-Za-z]{3,}$/.test(name) && /^[A-Za-z]{3,}$/.test(surname);
    },

    nickname_checker: async (nickname=ud?.nickname)=>{
        //Match any string composed with alphabet letters, digits and underscore, the string length is at least 1
        return /^\w*$/.test(nickname) && !(await Users.findOne({nickname:nickname}).exec());
    },

    checkall_userdata: async ({checkPlainPassword=true, checkEmail=true})=>{
        //every check must be true in order to validate user data

        //console.log(user_validator.empty_field_checker(), user_validator.name_surname_checker(), await user_validator.nickname_checker(), (checkPlainPassword ? user_validator.plain_password_checker() : true), (checkEmail ? await user_validator.email_checker() : true), user_validator.birth_checker());

        return user_validator.empty_field_checker() && user_validator.name_surname_checker() && await user_validator.nickname_checker()
        && (checkPlainPassword ? user_validator.plain_password_checker() : true) && (checkEmail ? await user_validator.email_checker() : true) && user_validator.birth_checker();
    }
}

function sanitize_object(obj, ignoreProperties=[""]){
    Object.keys(obj).forEach((key)=>{
        if(!ignoreProperties.includes(key))
            obj[key]=htmlsanitizer(obj[key]);
    });
    return obj;
}

module.exports={user_validator, sanitize_object};