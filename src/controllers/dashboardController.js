const { getDashboardCardSevice, getDashboardLineChartSevice, getDashboardRecentTransactionSevice } = require("../services/dashboardService");

const getDashboardCards = async (req, res) => {
    const { period = 'day' } = req.query;
    const userId = req.user._id;
    const data = await getDashboardCardSevice(userId, period);
    return res.status(200).json(data);
};

const getDashboardLineChart = async (req, res) => {
    const { period = 'day' } = req.query;
    const userId = req.user._id;
    const data = await getDashboardLineChartSevice(userId, period);
    return res.status(200).json(data);
};

const getRecentTransaction = async (req, res) => {
    const userId = req.user._id;
    const { limit } = req.query;
    const data = await getDashboardRecentTransactionSevice(userId, Number(limit) || 5);
    return res.status(200).json(data);
};

module.exports = {
    getDashboardCards, getDashboardLineChart, getRecentTransaction
}