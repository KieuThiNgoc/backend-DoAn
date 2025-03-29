const { getBudgetService, createBudgetService, updateBudgetService, deleteBudgetService } = require("../services/budgetService");

const getBudgets = async (req, res) => {
    const userId = req.user._id;
    const data = await getBudgetService(userId);
    return res.status(200).json(data);
};

const createBudgets = async (req, res) => {
    const userId = req.user._id;
    const { categoryId, amount, startDate, endDate } = req.body;
    const data = await createBudgetService(userId, categoryId, amount, startDate, endDate);
    return res.status(200).json(data);
};

const updateBudgets = async (req, res) => {
    const userId = req.user._id;
    const { budgetId, amount } = req.body;
    const data = await updateBudgetService(budgetId, userId, amount);
    if (data.success && data.notificationMessage) {
        return res.status(200).json({ ...data, notification: data.notificationMessage });
    }
    return res.status(200).json(data);
};

const deleteBudgets = async (req, res) => {
    const userId = req.user._id;
    const { budgetId } = req.body;
    const data = await deleteBudgetService(budgetId, userId);
    return res.status(200).json(data);
};

module.exports = {
    getBudgets,
    createBudgets,
    updateBudgets,
    deleteBudgets
};