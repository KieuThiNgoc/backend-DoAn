const Transactions = require("../models/transactions");
const Account = require('../models/accounts');
const mongoose = require('mongoose');

const getDashboardCardSevice = async (userId, period = 'day') => {
    try {
        const now = new Date();
        let currentStartDate = new Date();
        let previousStartDate = new Date();
        let previousEndDate = new Date();

        switch (period) {
            case 'day':
                currentStartDate.setHours(0, 0, 0, 0);
                previousStartDate.setDate(now.getDate() - 1);
                previousStartDate.setHours(0, 0, 0, 0);
                previousEndDate.setDate(now.getDate() - 1);
                previousEndDate.setHours(23, 59, 59, 999);
                break;

            case 'week':
                currentStartDate.setDate(now.getDate() - 7);
                currentStartDate.setHours(0, 0, 0, 0);
                previousStartDate.setDate(now.getDate() - 14);
                previousStartDate.setHours(0, 0, 0, 0);
                previousEndDate.setDate(now.getDate() - 8);
                previousEndDate.setHours(23, 59, 59, 999);
                break;

            case 'month':
                currentStartDate.setMonth(now.getMonth(), 1);
                currentStartDate.setHours(0, 0, 0, 0);
                previousStartDate.setMonth(now.getMonth() - 1, 1);
                previousStartDate.setHours(0, 0, 0, 0);
                previousEndDate.setMonth(now.getMonth(), 0);
                previousEndDate.setHours(23, 59, 59, 999);
                break;

            case 'year':
                currentStartDate.setFullYear(now.getFullYear(), 0, 1);
                currentStartDate.setHours(0, 0, 0, 0);
                previousStartDate.setFullYear(now.getFullYear() - 1, 0, 1);
                previousStartDate.setHours(0, 0, 0, 0);
                previousEndDate.setFullYear(now.getFullYear() - 1, 11, 31);
                previousEndDate.setHours(23, 59, 59, 999);
                break;

            default:
                currentStartDate.setMonth(now.getMonth(), 1);
                currentStartDate.setHours(0, 0, 0, 0);
                previousStartDate.setMonth(now.getMonth() - 1, 1);
                previousStartDate.setHours(0, 0, 0, 0);
                previousEndDate.setMonth(now.getMonth(), 0);
                previousEndDate.setHours(23, 59, 59, 999);
        }

        // Query tổng thu chi kỳ hiện tại
        const currentTotals = await Transactions.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId),
                    date: { $gte: currentStartDate, $lte: now }
                }
            },
            {
                $group: {
                    _id: "$type",
                    total: { $sum: "$amount" }
                }
            }
        ]);

        // Query tổng thu chi kỳ trước
        const previousTotals = await Transactions.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId),
                    date: { $gte: previousStartDate, $lte: previousEndDate }
                }
            },
            {
                $group: {
                    _id: "$type",
                    total: { $sum: "$amount" }
                }
            }
        ]);

        // Query số dư tài khoản hiện tại (không phụ thuộc kỳ)
        const accounts = await Account.aggregate([
            {
                $match: { userId: new mongoose.Types.ObjectId(userId) }
            },
            {
                $group: { _id: null, totalBalance: { $sum: "$balance" } }
            }
        ]);

        // Xử lý kết quả kỳ hiện tại
        const currentIncome = currentTotals.find(t => t._id === 'income')?.total || 0;
        const currentExpense = currentTotals.find(t => t._id === 'expense')?.total || 0;
        const balance = accounts[0]?.totalBalance || 0;

        // Xử lý kết quả kỳ trước
        const previousIncome = previousTotals.find(t => t._id === 'income')?.total || 0;
        const previousExpense = previousTotals.find(t => t._id === 'expense')?.total || 0;

        // Hàm tính phần trăm thay đổi
        const calculatePercentage = (current, previous) => {
            if (previous === 0) {
                return current > 0 ? 1 : 0; // Nếu kỳ trước = 0, trả về 100% nếu kỳ này > 0
            }
            return (current - previous) / previous; // Tính % thay đổi
        };

        // Tính phần trăm cho thu nhập
        const incomePercentage = calculatePercentage(currentIncome, previousIncome);

        // Tính phần trăm cho chi tiêu
        const expensePercentage = calculatePercentage(currentExpense, previousExpense);

        // Tính phần trăm cho số dư (dựa trên chênh lệch thu - chi giữa các kỳ)
        const previousBalance = previousIncome - previousExpense; // Số dư kỳ trước
        const currentBalance = currentIncome - currentExpense;    // Số dư kỳ hiện tại
        const balancePercentage = calculatePercentage(currentBalance, previousBalance);

        // Format tiền tệ
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
                overview: {
                    income: {
                        amount: currentIncome,
                        formatted: formatMoney(currentIncome),
                        percentage: incomePercentage
                    },
                    expense: {
                        amount: currentExpense,
                        formatted: formatMoney(currentExpense),
                        percentage: expensePercentage
                    },
                    balance: {
                        amount: balance,
                        formatted: formatMoney(balance),
                        percentage: balancePercentage
                    }
                },
                period: period,
                dateRange: {
                    from: currentStartDate,
                    to: now
                }
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

const getDashboardLineChartSevice = async (userId, period = 'day') => {
    try {
        const now = new Date();
        let startDate = new Date();
        let groupByFormat;

        switch (period) {
            case 'day':
                startDate = new Date(now);
                startDate.setHours(0, 0, 0, 0);
                groupByFormat = "%H:00"; // Nhóm theo giờ trong ngày
                break;
            case 'week':
                startDate.setDate(now.getDate() - 7);
                startDate.setHours(0, 0, 0, 0);
                groupByFormat = "%Y-%m-%dT00:00:00.000Z";
                break;
            case 'month':
                startDate.setMonth(now.getMonth() - 1);
                startDate.setHours(0, 0, 0, 0);
                groupByFormat = "%Y-%m-%dT00:00:00.000Z";
                break;
            case 'year':
                startDate.setFullYear(now.getFullYear() - 1);
                startDate.setMonth(0, 1);
                groupByFormat = "%Y-%m-%dT00:00:00.000Z";
                break;
            default:
                startDate.setHours(0, 0, 0, 0);
                groupByFormat = "%H:00";
        }

        const result = await Transactions.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId),
                    date: { $gte: startDate, $lte: now }
                }
            },
            {
                $group: {
                    _id: {
                        date: {
                            $dateToString: {
                                format: groupByFormat,
                                date: "$date",
                                timezone: "Asia/Ho_Chi_Minh"
                            }
                        },
                        type: "$type"
                    },
                    total: { $sum: "$amount" }
                }
            },
            {
                $group: {
                    _id: "$_id.date",
                    data: {
                        $push: { type: "$_id.type", amount: "$total" }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const categories = [];
        const incomeData = [];
        const expenseData = [];

        if (period === 'day') {
            // Tạo mảng 24 giờ
            for (let i = 0; i < 24; i++) {
                const hour = `${i.toString().padStart(2, '0')}:00`;
                const item = result.find(r => r._id === hour);
                categories.push(hour);
                incomeData.push(item?.data.find(t => t.type === 'income')?.amount || 0);
                expenseData.push(item?.data.find(t => t.type === 'expense')?.amount || 0);
            }
        } else {
            result.forEach(item => {
                categories.push(item._id);
                incomeData.push(item.data.find(t => t.type === 'income')?.amount || 0);
                expenseData.push(item.data.find(t => t.type === 'expense')?.amount || 0);
            });
        }

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

const getDashboardRecentTransactionSevice = async (userId, limit = 5) => {
    try {
        // Lấy danh sách giao dịch gần nhất
        const recentTransactions = await Transactions.aggregate([
            // Lọc theo userId
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId)
                }
            },
            // Join với bảng categories để lấy tên danh mục
            {
                $lookup: {
                    from: 'categories',
                    localField: 'categoryId',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            // Giải nén mảng category
            { $unwind: '$category' },
            // Chọn và định dạng các trường cần thiết
            {
                $project: {
                    _id: 1,
                    date: 1,
                    amount: 1,
                    // Chuyển đổi type sang tiếng Việt
                    type: {
                        $cond: {
                            if: { $eq: ['$type', 'income'] },
                            then: 'Thu nhập',
                            else: 'Chi tiêu'
                        }
                    },
                    category: '$category.name'
                }
            },
            // Sắp xếp theo ngày mới nhất
            { $sort: { date: -1 } },
            // Giới hạn số lượng kết quả
            { $limit: limit }
        ]);

        // Format ngày và số tiền theo định dạng Việt Nam
        const formattedTransactions = recentTransactions.map(transaction => ({
            _id: transaction._id,
            // Format ngày giờ: DD/MM/YYYY HH:mm
            date: new Date(transaction.date).toLocaleString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            // Format tiền tệ: x.xxx.xxx ₫
            amount: new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
            }).format(transaction.amount),
            type: transaction.type,
            category: transaction.category
        }));

        return {
            EC: 0,
            EM: formattedTransactions.length > 0 ? "Lấy dữ liệu thành công" : "Không có giao dịch nào",
            DT: formattedTransactions
        };

    } catch (error) {
        console.log("Lỗi khi lấy giao dịch gần đây:", error);
        return {
            EC: 1,
            EM: "Lỗi khi lấy dữ liệu",
            DT: []
        };
    }
};

module.exports = {
    getDashboardCardSevice, getDashboardLineChartSevice, getDashboardRecentTransactionSevice
};