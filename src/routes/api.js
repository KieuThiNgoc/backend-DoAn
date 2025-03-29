const express = require('express');
const { createUser, handleLogin, getUser,
    getAccount
} = require('../controllers/userController');
const auth = require('../middleware/auth');
const delay = require('../middleware/delay');
const { createAccounts, getAccounts, updateAccount, deleteAccount } = require('../controllers/accountController');

const routerAPI = express.Router();

routerAPI.all("*", auth);

routerAPI.get("/", (req, res) => {
    return res.status(200).json("Hello world api")
})

routerAPI.post("/register", createUser);
routerAPI.post("/login", handleLogin);

routerAPI.get("/user", getUser);
routerAPI.get("/account", delay, getAccount);

routerAPI.post("/accounts", createAccounts);
routerAPI.get("/accounts", getAccounts);
routerAPI.put("/accounts", updateAccount);
routerAPI.delete("/accounts", deleteAccount);

module.exports = routerAPI; //export default