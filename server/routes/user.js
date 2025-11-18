const router                            = require("express").Router();
const { retrieveHtmlForm }              = require("../middlewares");
const { Users, Posts, Accesses }        = require("../mongo-schemas");
const bcrypt                            = require("bcrypt");
const fs                                = require("fs");
const {user_validator, sanitize_object} = require("../utils");

router.get("/", async (req, res) => {
    let user;
    if (req.query.nickname) {
        user = await Users.findOne({ nickname: req.query.nickname }).exec();
    } else {
        user = res.locals.user;
    }

    if (user)
        res.send(user);
    else
        res.status(404).send(`Client error: User ${req.query.nickname} not found.`);
});

router.post("/edit", retrieveHtmlForm,
    async (req, res) => {
        let user = res.locals.user;

        user.name = res.locals.fields?.name?.[0] || user.name;
        user.surname = res.locals.fields?.surname?.[0] || user.surname;
        user.birth = res.locals.fields?.birth?.[0] || user.birth;
        user.nickname = res.locals.fields?.nickname?.[0] || user.nickname;

        user_validator.setUserData(user);
        const valid_infos = user_validator.checkall_userdata({ checkEmail: false, checkPlainPassword: false });

        if (!valid_infos)
            return res.status(400).send("Client error: Invalid data passed");

        if (res.locals.files?.pfp?.[0]) {
            const pfp = res.locals.files.pfp[0];
            if (!/^image\/(?:png|jpeg|jpg)$/.test(pfp.mimetype)) {
                return res.status(415).send("Client error: Image format not supported.");//415=media type not supported
            }
            try {
                fs.readFile(pfp.filepath, (err, data) => {
                    if (err)
                        throw err;

                    user.profilepic = "pfp_" + user._id + "." + pfp.mimetype.split("/")[1];
                    fs.writeFile(`${process.env.IMAGES_PATH + user.profilepic}`, data, (err) => {
                        if (err)
                            throw err;

                        Users.findByIdAndUpdate(user._id, {
                            name: user.name,
                            surname: user.surname,
                            birth: user.birth,
                            profilepic: user.profilepic
                        }, { new: true }).exec()
                            .then((updated_user) => {
                                res.send(updated_user);
                            })
                            .catch((err) => {
                                res.status(500).send(err);
                            });

                    });
                });
            } catch (err) {
                console.log(`Error during image writing in post creation:\n${err}`);
                res.status(500).send("Server error: Image uploading failed.");
            }
        }
        else {
            const updated_user = await Users.findByIdAndUpdate(user._id, {
                name: user.name,
                surname: user.surname,
                birth: user.birth
            }, { new: true }).exec();

            updated_user ? res.send(updated_user) : res.status(500).send("Server error: User could not be modified.");
        }
    }
);

router.get("/delete", async (req, res) => {
    try {
        await Posts.deleteMany({ user_id: res.locals.user._id }).exec();
        await Users.findByIdAndDelete(res.locals.user._id).exec();
        await Accesses.findOneAndDelete({ user_id: res.locals.user._id }).exec();

        fs.promises.readdir(process.env.IMAGES_PATH, {})
        .then((files)=>{
            const imgsToDelete = files.filter(image => image.includes(res.locals.user._id));
            console.log(imgsToDelete);
            imgsToDelete.forEach((image) => {
                fs.unlink(process.env.IMAGES_PATH + image, (err) => {
                    if (err)
                        throw err;
                });
            });
        })
        .then((val)=>res.send("Account eliminated successfully."))
        .catch((err)=>{
            console.log(err);
            res.status(500).send("Server error: account deletion failed.");
        });

    } catch (error) {
        console.log(error);
        res.status(500).send("Server error: account deletion failed.");
    }
});

router.post("/change-password", retrieveHtmlForm,
    async (req, res)=>{
        const old_password = res.locals.fields?.old_password?.[0];
        const new_password = res.locals.fields?.new_password?.[0];
        const confirm = res.locals.fields?.confirm?.[0];

        const is_old_password_correct = await bcrypt.compare(old_password, res.locals.user.password);
        if(!is_old_password_correct)
            return res.status(401).send("Client error: Old password incorrect.");

        if(old_password==new_password)
            return res.status(400).send("Client error: New password can't be equal to the old one.");

        if(!user_validator.plain_password_checker(new_password))
            return res.status(400).send("Client error: New password doesn't meet password requirments.");
        
        if(new_password!=confirm)
            return res.status(400).send("Client error: New password isn't confirmed.");
        

        const salt = await bcrypt.genSalt(10);
        const hashed_password = await bcrypt.hash(new_password, salt);

        const user_updated = await Users.findByIdAndUpdate(res.locals.user._id, {password:hashed_password}).exec();

        user_updated ? res.send("Password changed successfully.") : res.status(500).send("Password couldn't be changed.");
    }
);

router.get("/follow", async (req, res)=>{
    if(!req.query?.nickname)
        return res.status(400).send("Client error: No nickname provided in url.");

    if(req.query.nickname==res.locals.user.nickname)
        return res.status(400).send("Client error: Sorry, but you can't follow yourself :/.");
    
    const user_to_follow = await Users.findOne({nickname:req.query.nickname});
    if(!user_to_follow)
        return res.status(404).send("Client error: User not found.");

    const follower_index = user_to_follow.followers.indexOf(res.locals.user._id);
    if(follower_index==-1){
        user_to_follow.followers.push(res.locals.user._id);
        user_to_follow.save()
            .then(val=>res.send(`You started following ${req.query.nickname} .`))
            .catch((err)=>{
                console.log(`Error in following user\n${err}`);
                res.status(500).send(`Server error: following user ${req.query.nickname} failed.`);
            });
    }
    else{
        user_to_follow.followers.splice(follower_index, 1);
        user_to_follow.save()
            .then(val=>res.send(`Now unfollowing ${req.query.nickname}`))
            .catch((err)=>{
                console.log(`Error in following user\n${err}`);
                res.status(500).send(`Server error: following user ${req.query.nickname} failed.`);
            });
    }
});

module.exports = router;