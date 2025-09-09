const Transactions = require("../models/transactions");
const Account = require('../models/accounts');
const Categories = require("../models/categories");
const { updateBudgetSpent, decreaseBudgetSpent } = require('./budgetService');

const getTransactionService = async (userId, startDate, endDate) => {
    try {
        let query = { userId };

        if (startDate && endDate) {
            query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        let transactions = await Transactions.find(query);

        const accountIds = [...new Set(transactions.map(t => t.accountId))];
        const categoryIds = [...new Set(transactions.map(t => t.categoryId))];

        const accounts = await Account.find({ _id: { $in: accountIds }, userId }, 'name');
        const categories = await Categories.find({ _id: { $in: categoryIds }, userId }, 'name');

        const accountMap = new Map(accounts.map(acc => [acc._id.toString(), acc.name]));
        const categoryMap = new Map(categories.map(cat => [cat._id.toString(), cat.name]));

        const result = transactions.map(transaction => ({
            ...transaction._doc,
            accountName: accountMap.get(transaction.accountId.toString()),
            categoryName: categoryMap.get(transaction.categoryId.toString())
        }));

        return result;
    } catch (error) {
        console.log("Lỗi khi lấy danh sách giao dịch:", error);
        return null;
    }
};

const createTransactionService = async (userId, amount, type, accountId, categoryId, date, description = '') => {
    try {
        if (amount <= 0) {
            return { EC: 1, EM: "Số tiền phải lớn hơn 0!" };
        }
        if (!['income', 'expense'].includes(type)) {
            return { EC: 2, EM: "Loại giao dịch không hợp lệ!" };
        }

        const account = await Account.findOne({ _id: accountId, userId });
        if (!account) {
            return { EC: 3, EM: "Tài khoản không tồn tại hoặc không thuộc về bạn!" };
        }

        const category = await Categories.findOne({ _id: categoryId, userId, type });
        if (!category) {
            return { EC: 4, EM: "Danh mục không tồn tại hoặc không phù hợp với loại giao dịch!" };
        }

        amount = Number(amount);
        let newBalance = Number(account.balance);
        if (isNaN(amount) || isNaN(newBalance)) {
            return { EC: 5, EM: "Số tiền không hợp lệ!" };
        }

        if (type === 'expense' && !account.isCash && amount > account.balance) {
            return { EC: 6, EM: "Số tiền chi tiêu vượt quá số dư tài khoản!" };
        }

        if (type === 'income') {
            newBalance += amount;
        } else {
            newBalance -= amount;
        }

        // Xử lý thời gian: nếu không có date thì dùng giờ hiện tại, nếu có thì kết hợp giờ hiện tại
        const transactionDate = date
            ? new Date(`${date}T${new Date().toLocaleTimeString('en-US', { hour12: false })}`)
            : new Date();

        const session = await Transactions.startSession();
        let result;

        try {
            session.startTransaction();

            const newTransaction = await Transactions.create([{
                userId,
                amount,
                type,
                accountId,
                categoryId,
                date: transactionDate, // Sử dụng thời gian đã xử lý
                description
            }], { session });

            await Account.findByIdAndUpdate(
                accountId,
                { balance: newBalance },
                { session }
            );

            let notificationMessage = null;
            if (type === 'expense') {
                const budgetUpdateResult = await updateBudgetSpent(userId, categoryId, amount, transactionDate);
                if (budgetUpdateResult && budgetUpdateResult.notificationMessage) {
                    notificationMessage = budgetUpdateResult.notificationMessage;
                }
            }

            await session.commitTransaction();
            result = {
                EC: 0,
                EM: "Tạo giao dịch thành công!",
                DT: newTransaction[0],
                notificationMessage
            };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

        return result;
    } catch (error) {
        console.log("Lỗi khi tạo giao dịch:", error);
        return null;
    }
};

const updateTransactionService = async (transactionId, userId, amount, type, accountId, categoryId, date, description = '') => {
    try {
        const transaction = await Transactions.findOne({ _id: transactionId, userId });
        if (!transaction) {
            return { EC: 1, EM: "Giao dịch không tồn tại hoặc không thuộc về bạn!" };
        }

        if (amount <= 0) {
            return { EC: 2, EM: "Số tiền phải lớn hơn 0!" };
        }

        if (!['income', 'expense'].includes(type)) {
            return { EC: 3, EM: "Loại giao dịch không hợp lệ!" };
        }

        const newAccount = await Account.findOne({ _id: accountId, userId });
        if (!newAccount) {
            return { EC: 4, EM: "Tài khoản không tồn tại hoặc không thuộc về bạn!" };
        }

        const category = await Categories.findOne({ _id: categoryId, userId, type });
        if (!category) {
            return { EC: 5, EM: "Danh mục không tồn tại hoặc không phù hợp với loại giao dịch!" };
        }

        amount = Number(amount);
        const oldAccountId = transaction.accountId.toString();
        const newAccountId = accountId.toString();

        // Xử lý thời gian: nếu có date mới thì kết hợp giờ hiện tại, nếu không thì giữ nguyên
        const transactionDate = date
            ? new Date(`${date}T${new Date().toLocaleTimeString('en-US', { hour12: false })}`)
            : transaction.date;

        const session = await Transactions.startSession();
        let result;

        try {
            session.startTransaction();

            if (oldAccountId === newAccountId) {
                let currentBalance = Number(newAccount.balance);
                if (transaction.type === 'income') {
                    currentBalance -= transaction.amount;
                } else {
                    currentBalance += transaction.amount;
                }

                if (type === 'expense' && !newAccount.isCash && amount > currentBalance) {
                    await session.abortTransaction();
                    session.endSession();
                    return { EC: 6, EM: "Số tiền chi tiêu vượt quá số dư tài khoản!" };
                }

                if (type === 'income') {
                    currentBalance += amount;
                } else {
                    currentBalance -= amount;
                }

                await Account.findByIdAndUpdate(
                    newAccountId,
                    { balance: currentBalance },
                    { session }
                );
            } else {
                const oldAccount = await Account.findById(oldAccountId);
                let oldBalance = Number(oldAccount.balance);
                let newBalance = Number(newAccount.balance);

                if (transaction.type === 'income') {
                    oldBalance -= transaction.amount;
                } else {
                    oldBalance += transaction.amount;
                }

                if (type === 'expense' && !newAccount.isCash && amount > newBalance) {
                    await session.abortTransaction();
                    session.endSession();
                    return { EC: 6, EM: "Số tiền chi tiêu vượt quá số dư tài khoản!" };
                }

                if (type === 'income') {
                    newBalance += amount;
                } else {
                    newBalance -= amount;
                }

                await Account.findByIdAndUpdate(
                    oldAccountId,
                    { balance: oldBalance },
                    { session }
                );
                await Account.findByIdAndUpdate(
                    newAccountId,
                    { balance: newBalance },
                    { session }
                );
            }

            let notificationMessage = null;
            if (transaction.type === 'expense') {
                const budgetDecreaseResult = await decreaseBudgetSpent(userId, transaction.categoryId, transaction.amount, transaction.date);
                if (budgetDecreaseResult && budgetDecreaseResult.notificationMessage) {
                    notificationMessage = budgetDecreaseResult.notificationMessage;
                }
            }

            if (type === 'expense') {
                const budgetUpdateResult = await updateBudgetSpent(userId, categoryId, amount, transactionDate);
                if (budgetUpdateResult && budgetUpdateResult.notificationMessage) {
                    notificationMessage = budgetUpdateResult.notificationMessage;
                }
            }

            const updatedTransaction = await Transactions.findByIdAndUpdate(
                transactionId,
                {
                    amount,
                    type,
                    accountId,
                    categoryId,
                    date: transactionDate, // Sử dụng thời gian đã xử lý
                    description
                },
                { new: true, session }
            );

            await session.commitTransaction();
            result = {
                EC: 0,
                EM: "Cập nhật giao dịch thành công!",
                DT: updatedTransaction,
                notificationMessage
            };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

        return result;
    } catch (error) {
        console.log("Lỗi khi cập nhật giao dịch:", error);
        return null;
    }
};

const deleteTransactionService = async (transactionId, userId) => {
    try {
        const transaction = await Transactions.findOne({ _id: transactionId, userId });
        if (!transaction) {
            return { EC: 1, EM: "Giao dịch không tồn tại hoặc bạn không có quyền xóa!" };
        }

        const account = await Account.findById(transaction.accountId);
        if (!account) {
            return { EC: 2, EM: "Tài khoản liên quan đến giao dịch không tồn tại!" };
        }

        let newBalance = Number(account.balance);
        if (transaction.type === 'income') {
            newBalance -= Number(transaction.amount);
        } else if (transaction.type === 'expense') {
            newBalance += Number(transaction.amount);
        }

        if (!account.isCash && newBalance < 0) {
            return { EC: 3, EM: "Không thể xóa giao dịch vì số dư tài khoản không được âm!" };
        }

        const session = await Transactions.startSession();
        let result;

        try {
            session.startTransaction();

            let notificationMessage = null;
            if (transaction.type === 'expense') {
                const budgetDecreaseResult = await decreaseBudgetSpent(userId, transaction.categoryId, transaction.amount, transaction.date);
                if (budgetDecreaseResult && budgetDecreaseResult.notificationMessage) {
                    notificationMessage = budgetDecreaseResult.notificationMessage;
                }
            }

            await Transactions.findByIdAndDelete(transactionId, { session });

            await Account.findByIdAndUpdate(
                transaction.accountId,
                { balance: newBalance },
                { session }
            );

            await session.commitTransaction();
            result = {
                EC: 0,
                EM: "Xóa giao dịch thành công!",
                notificationMessage
            };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

        return result;
    } catch (error) {
        console.log("Lỗi khi xóa giao dịch:", error);
        return null;
    }
};

module.exports = {
    getTransactionService,
    createTransactionService,
    updateTransactionService,
    deleteTransactionService
};