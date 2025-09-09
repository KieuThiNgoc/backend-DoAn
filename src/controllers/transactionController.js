const { getTransactionService, createTransactionService, updateTransactionService, deleteTransactionService } = require("../services/transactionService");

const getTransactions = async (req, res) => {
    const { startDate, endDate } = req.query;
    const userId = req.user._id;
    const data = await getTransactionService(userId, startDate, endDate);
    return res.status(200).json(data);
};

const createTransactions = async (req, res) => {
    const { amount, type, accountId, categoryId, date, description } = req.body;
    const userId = req.user._id;
    const data = await createTransactionService(userId, amount, type, accountId, categoryId, date, description);
    if (data && data.EC === 0 && data.notificationMessage) {
        return res.status(200).json({ ...data, notification: data.notificationMessage });
    }
    return res.status(200).json(data);
};

const updateTransactions = async (req, res) => {
    const { transactionId, amount, type, accountId, categoryId, date, description } = req.body;
    const userId = req.user._id;
    const data = await updateTransactionService(
        transactionId,
        userId,
        amount,
        type,
        accountId,
        categoryId,
        date,
        description
    );
    if (data && data.EC === 0 && data.notificationMessage) {
        return res.status(200).json({ ...data, notification: data.notificationMessage });
    }
    return res.status(200).json(data);
};

const deleteTransactions = async (req, res) => {
    const { transactionId } = req.body;
    const userId = req.user._id;
    const data = await deleteTransactionService(transactionId, userId);
    if (data && data.EC === 0 && data.notificationMessage) {
        return res.status(200).json({ ...data, notification: data.notificationMessage });
    }
    return res.status(200).json(data);
};

module.exports = {
    getTransactions,
    createTransactions,
    updateTransactions,
    deleteTransactions
};