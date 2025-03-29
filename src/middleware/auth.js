require("dotenv").config();
const { name } = require("ejs");
const jwt = require("jsonwebtoken");


const auth = (req, res, next) => {

    const white_lists = ["/", "/register", "/login"];
    if (white_lists.find(item => '/v1/api' + item === req.originalUrl)) {
        return next();
    } else {
        if (req.headers && req.headers.authorization) {
            const token = req.headers.authorization.split(" ")[1];

            //verify token
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                req.user = {
                    email: decoded.email,
                    name: decoded.name,
                    _id: decoded._id
                }
                console.log("Token: ", decoded);
                next();
            } catch (error) {
                return res.status(401).json({
                    message: "Token hết hạn hoặc không hợp lệ"
                });
            }
        } else {
            //return exception
            return res.status(401).json({
                message: "Unauthorized"
            });
        }
    }

}

module.exports = auth;