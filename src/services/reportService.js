const Transactions = require("../models/transactions");
const Account = require('../models/accounts');
const Categories = require("../models/categories");
const mongoose = require('mongoose');

const getReportByDateService = async (userId, startDate, endDate) => {
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);

        let matchStage = {
            userId: new mongoose.Types.ObjectId(userId),
            date: {
                $gte: start,
                $lte: end
            }
        };

        const dailyTotals = await Transactions.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: {
                        date: {
                            $dateToString: {
                                format: "%Y-%m-%d",
                                date: "$date",
                                timezone: "Asia/Ho_Chi_Minh"
                            }
                        },
                        type: "$type"
                    },
                    totalAmount: { $sum: "$amount" }
                }
            },
            {
                $group: {
                    _id: "$_id.date",
                    totals: {
                        $push: {
                            type: "$_id.type",
                            amount: "$totalAmount"
                        }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const result = dailyTotals.map(day => ({
            date: day._id,
            income: day.totals.find(t => t.type === 'income')?.amount || 0,
            expense: day.totals.find(t => t.type === 'expense')?.amount || 0,
        }));

        return {
            EC: 0,
            EM: result.length > 0 ? "Lấy báo cáo thành công" : "Không có dữ liệu trong khoảng thời gian này",
            DT: result
        };
    } catch (error) {
        console.log("Lỗi khi lấy danh sách:", error);
        return null;
    }
};

const getReportByCategoryService = async (userId, startDate, endDate) => {
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);

        let matchStage = {
            userId: new mongoose.Types.ObjectId(userId),
            type: 'expense',
            date: {
                $gte: start,
                $lte: end
            }
        };

        const expenseByCategory = await Transactions.aggregate([
            { $match: matchStage },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'categoryId',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: '$category' },
            {
                $group: {
                    _id: '$categoryId',
                    name: { $first: '$category.name' },
                    amount: { $sum: '$amount' }
                }
            },
            {
                $project: {
                    categoryId: '$_id',
                    name: 1,
                    amount: 1,
                    _id: 0
                }
            },
            { $sort: { amount: -1 } }
        ]);

        // Tính tổng chi tiêu
        const totalExpense = expenseByCategory.reduce((sum, cat) => sum + cat.amount, 0);

        // Thêm tỷ lệ phần trăm cho mỗi danh mục
        const result = expenseByCategory.map(cat => ({
            ...cat,
            percentage: totalExpense > 0 ? (cat.amount / totalExpense * 100).toFixed(2) : 0
        }));

        return {
            EC: 0,
            EM: result.length > 0 ? "Lấy báo cáo thành công" : "Không có dữ liệu trong khoảng thời gian này",
            DT: {
                byCategory: result,
                totalExpense: totalExpense
            }
        };
    } catch (error) {
        console.log("Lỗi khi lấy danh sách:", error);
        return null;
    }
}

module.exports = { getReportByDateService, getReportByCategoryService };