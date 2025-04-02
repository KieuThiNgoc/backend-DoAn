const Transactions = require("../models/transactions");
const Account = require('../models/accounts');
const mongoose = require('mongoose');

const getDashboardTableSevice = async (userId, year) => {
    try {
        const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
        const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

        // Tổng thu chi theo tháng trong năm
        const monthlyTotals = await Transactions.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId),
                    date: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: { month: { $month: "$date" }, type: "$type" },
                    total: { $sum: "$amount" }
                }
            },
            {
                $group: {
                    _id: "$_id.month",
                    data: { $push: { type: "$_id.type", total: "$total" } }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Tổng số dư tài khoản
        const accounts = await Account.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            { $group: { _id: null, totalBalance: { $sum: "$balance" } } }
        ]);

        const balance = accounts[0]?.totalBalance || 0;
        const tableData = Array.from({ length: 12 }, (_, i) => {
            const month = i + 1;
            const monthData = monthlyTotals.find(t => t._id === month) || { data: [] };
            const income = monthData.data.find(t => t.type === 'income')?.total || 0;
            const expense = monthData.data.find(t => t.type === 'expense')?.total || 0;

            return {
                month: `${month}`,
                income: income,
                expense: expense,
                balance: income - expense // Số dư từng tháng
            };
        });

        const formatMoney = (amount) => {
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
            }).format(amount);
        };

        return {
            EC: 0,
            EM: "Lấy thông tin thành công",
            DT: {
                tableData: tableData.map(item => ({
                    month: item.month,
                    income: { amount: item.income, formatted: formatMoney(item.income) },
                    expense: { amount: item.expense, formatted: formatMoney(item.expense) },
                    balance: { amount: item.balance, formatted: formatMoney(item.balance) }
                })),
                totalBalance: { amount: balance, formatted: formatMoney(balance) },
                year: year
            }
        };
    } catch (error) {
        console.log("Lỗi khi lấy thông tin dashboard:", error);
        return {
            EC: 1,
            EM: "Lỗi khi lấy thông tin",
            DT: null
        };
    }
};

const getDashboardBarChartSevice = async (userId, year) => {
    try {
        const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
        const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

        const result = await Transactions.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId),
                    date: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: {
                        month: { $month: "$date" },
                        type: "$type"
                    },
                    total: { $sum: "$amount" }
                }
            },
            {
                $group: {
                    _id: "$_id.month",
                    data: {
                        $push: { type: "$_id.type", amount: "$total" }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const categories = Array.from({ length: 12 }, (_, i) => `${i + 1}`);
        const incomeData = new Array(12).fill(0);
        const expenseData = new Array(12).fill(0);

        result.forEach(item => {
            const monthIndex = item._id - 1; // Tháng từ 1-12, index từ 0-11
            const income = item.data.find(t => t.type === 'income')?.amount || 0;
            const expense = item.data.find(t => t.type === 'expense')?.amount || 0;
            incomeData[monthIndex] = income;
            expenseData[monthIndex] = expense;
        });

        return {
            EC: 0,
            EM: "Lấy dữ liệu thành công",
            DT: {
                series: [
                    { name: 'Tiền thu', data: incomeData },
                    { name: 'Tiền chi', data: expenseData }
                ],
                categories: categories
            }
        };
    } catch (error) {
        console.log("Lỗi khi lấy dữ liệu biểu đồ:", error);
        return {
            EC: 1,
            EM: "Lỗi khi lấy dữ liệu",
            DT: { series: [], categories: [] }
        };
    }
};

module.exports = {
    getDashboardTableSevice, getDashboardBarChartSevice
};