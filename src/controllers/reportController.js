const { getReportByDateService, getReportByCategoryService } = require("../services/reportService");

const getReportsBarChart = async (req, res) => {
    const { startDate, endDate } = req.query;
    const userId = req.user._id;
    const data = await getReportByDateService(userId, startDate, endDate);
    return res.status(200).json(data);
};

const getReportsPieChart = async (req, res) => {
    const { startDate, endDate } = req.query;
    const userId = req.user._id;
    const data = await getReportByCategoryService(userId, startDate, endDate);
    return res.status(200).json(data);
};

module.exports = {
    getReportsBarChart, getReportsPieChart
}