require('dotenv').config();
const User = require("../models/user");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const saltRounds = 10;


const createUserService = async (name, email, password) => {
    try {
        //check user exist
        const user = await User.findOne({ email });
        if (user) {
            console.log(`>> user exist, chọn 1 email khác: ${email}`);
            return null;
        }
        //hash password
        const hashPassword = await bcrypt.hash(password, saltRounds);
        //save user to database
        let result = await User.create({
            name: name,
            email: email,
            password: hashPassword,
            role: "customer"
        })
        return result;

    } catch (error) {
        console.log(error);
        return null;
    }
}

const loginService = async (email1, password) => {
    try {
        //fetch user by email
        const user = await User.findOne({ email: email1 });
        if (user) {
            //compare password
            const isMatchPassword = await bcrypt.compare(password, user.password);
            if (!isMatchPassword) {
                return {
                    EC: 2,
                    EM: "Email hoặc Password không hợp lệ!"
                };
            } else {
                //create an access token
                const payload = {
                    email: user.email,
                    name: user.name,
                    _id: user._id.toString()
                }

                const access_token = jwt.sign(
                    payload,
                    process.env.JWT_SECRET,
                    {
                        expiresIn: process.env.JWT_EXPIRES_IN
                    }
                );
                return {
                    EC: 0,
                    access_token,
                    user: {
                        name: user.name,
                        email: user.email,
                        _id: user._id.toString()
                    }
                };
            }
        } else {
            return {
                EC: 1,
                EM: "Email hoặc Password không hợp lệ!"
            };
        }

    } catch (error) {
        console.log(error);
        return null;
    }
}

const getUserService = async () => {
    try {

        let result = await User.find({}).select("-password");
        return result;

    } catch (error) {
        console.log(error);
        return null;
    }
}

module.exports = {
    createUserService, loginService, getUserService
}