const { getDashboardTableSevice, getDashboardBarChartSevice } = require("../services/dashboardService");

const getDashboardTable = async (req, res) => {
    const { year = new Date().getFullYear() } = req.query;
    const userId = req.user._id;
    const data = await getDashboardTableSevice(userId, year);
    return res.status(200).json(data);
};

const getDashboardBarChart = async (req, res) => {
    const { year = new Date().getFullYear() } = req.query;
    const userId = req.user._id;
    const data = await getDashboardBarChartSevice(userId, year);
    return res.status(200).json(data);
};

module.exports = {
    getDashboardTable, getDashboardBarChart
}