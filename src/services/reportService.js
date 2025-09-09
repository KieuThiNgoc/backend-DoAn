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

        let matchStageExpense = {
            userId: new mongoose.Types.ObjectId(userId),
            type: 'expense',
            date: { $gte: start, $lte: end }
        };

        let matchStageIncome = {
            userId: new mongoose.Types.ObjectId(userId),
            type: 'income',
            date: { $gte: start, $lte: end }
        };

        // Tính phân bổ chi tiêu theo danh mục + chi tiết giao dịch
        const expenseByCategory = await Transactions.aggregate([
            { $match: matchStageExpense },
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
                    amount: { $sum: '$amount' },
                    transactions: {
                        $push: {
                            date: '$date',
                            amount: '$amount',
                            description: '$description' // Thêm các trường bạn muốn hiển thị
                        }
                    }
                }
            },
            {
                $project: {
                    categoryId: '$_id',
                    name: 1,
                    amount: 1,
                    transactions: 1,
                    _id: 0
                }
            },
            { $sort: { amount: -1 } }
        ]);

        // Tính phân bổ thu nhập theo danh mục + chi tiết giao dịch
        const incomeByCategory = await Transactions.aggregate([
            { $match: matchStageIncome },
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
                    amount: { $sum: '$amount' },
                    transactions: {
                        $push: {
                            date: '$date',
                            amount: '$amount',
                            description: '$description' // Thêm các trường bạn muốn hiển thị
                        }
                    }
                }
            },
            {
                $project: {
                    categoryId: '$_id',
                    name: 1,
                    amount: 1,
                    transactions: 1,
                    _id: 0
                }
            },
            { $sort: { amount: -1 } }
        ]);

        // Tính tổng chi và tổng thu
        const totalExpense = expenseByCategory.reduce((sum, cat) => sum + cat.amount, 0);
        const totalIncome = incomeByCategory.reduce((sum, cat) => sum + cat.amount, 0);

        // Thêm phần trăm cho chi tiêu
        const expenseResult = expenseByCategory.map(cat => ({
            ...cat,
            percentage: totalExpense > 0 ? (cat.amount / totalExpense * 100).toFixed(2) : 0
        }));

        // Thêm phần trăm cho thu nhập
        const incomeResult = incomeByCategory.map(cat => ({
            ...cat,
            percentage: totalIncome > 0 ? (cat.amount / totalIncome * 100).toFixed(2) : 0
        }));

        return {
            EC: 0,
            EM: (expenseResult.length > 0 || incomeResult.length > 0) ? "Lấy báo cáo thành công" : "Không có dữ liệu trong khoảng thời gian này",
            DT: {
                expenseByCategory: expenseResult,
                incomeByCategory: incomeResult,
                totalExpense: totalExpense,
                totalIncome: totalIncome
            }
        };
    } catch (error) {
        console.log("Lỗi khi lấy danh sách:", error);
        return null;
    }
};

module.exports = { getReportByDateService, getReportByCategoryService };