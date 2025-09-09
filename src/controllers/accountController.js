const { createAccountService, getAccountService, updateAccountService, deleteAccountService } = require("../services/accountService");


const createAccounts = async (req, res) => {
    const { name, balance, isCash } = req.body;
    const userId = req.user._id;
    const data = await createAccountService(userId, name, balance, isCash);
    return res.status(200).json(data);
};

const getAccounts = async (req, res) => {
    const userId = req.user._id;
    const data = await getAccountService(userId);
    return res.status(200).json(data);
};

const updateAccount = async (req, res) => {
    const { accountId, name, isCash } = req.body;
    const userId = req.user._id;
    const data = await updateAccountService(accountId, userId, name, isCash);
    return res.status(200).json(data);
};

const deleteAccount = async (req, res) => {
    const { accountId } = req.body;
    const userId = req.user._id; 
    const data = await deleteAccountService(accountId, userId);
    return res.status(200).json(data);
};

module.exports = {
    createAccounts, getAccounts, updateAccount, deleteAccount

}