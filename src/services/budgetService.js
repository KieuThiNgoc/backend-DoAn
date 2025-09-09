const Budget = require('../models/budgets');
const Categories = require("../models/categories");
const Transactions = require("../models/transactions");
const Account = require('../models/accounts');
const { createNotificationService } = require('./notificationService');

const getBudgetService = async (userId) => {
    try {
        const budgets = await Budget.find({ userId });

        const categoryIds = [...new Set(budgets.map(budget => budget.categoryId))];

        const categories = await Categories.find({ _id: { $in: categoryIds } }, 'name');
        const categoryMap = new Map(categories.map(cat => [cat._id.toString(), cat.name]));

        const budgetData = budgets.map(budget => {
            const spentPercentage = (budget.spent / budget.amount) * 100;
            return {
                ...budget._doc,
                categoryName: categoryMap.get(budget.categoryId.toString()),
                spentPercentage: spentPercentage.toFixed(2),
                remaining: budget.amount - budget.spent
            };
        });

        return budgetData;
    } catch (error) {
        console.log("Lỗi khi lấy danh sách ngân sách:", error);
        return null;
    }
};

const createBudgetService = async (userId, categoryId, amount, startDate, endDate) => {
    try {
        // Lấy tổng số dư của tất cả tài khoản
        const accounts = await Account.find({ userId }); // Sử dụng Account model để lấy danh sách tài khoản
        if (!accounts) {
            return { success: false, message: 'Không thể lấy danh sách tài khoản.' };
        }
        const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

        // Lấy danh sách ngân sách hiện tại của người dùng
        const existingBudgets = await Budget.find({ userId });
        const totalExistingBudget = existingBudgets.reduce((sum, budget) => sum + budget.amount, 0);

        // Tính tổng ngân sách sau khi thêm ngân sách mới
        const totalBudgetAfterAdd = totalExistingBudget + amount;

        // Kiểm tra nếu tổng ngân sách vượt quá tổng số dư
        if (totalBudgetAfterAdd > totalBalance) {
            return {
                success: false,
                EM: `Ngân sách đã vượt quá số dư hiện có!`
            };
        }

        // Kiểm tra ngân sách trùng lặp
        const existingBudget = await Budget.findOne({
            userId,
            categoryId,
            startDate: { $lte: endDate },
            endDate: { $gte: startDate }
        });

        if (existingBudget) {
            return { success: false, message: 'Đã tồn tại ngân sách cho danh mục này trong khoảng thời gian đã chọn.' };
        }

        const category = await Categories.findById(categoryId, 'name');
        if (!category) {
            return { success: false, message: 'Danh mục không tồn tại.' };
        }

        const newBudget = new Budget({
            userId,
            categoryId,
            amount,
            startDate,
            endDate,
            spent: 0
        });

        await newBudget.save();

        // Thêm thông báo khi tạo ngân sách
        const notificationMessage = `Ngân sách ${amount.toLocaleString()} cho danh mục ${category.name} đã được tạo từ ${startDate} đến ${endDate}!`;
        await createNotificationService(userId, notificationMessage);

        return {
            success: true,
            message: 'Ngân sách đã được tạo',
            notificationMessage,
            budget: newBudget
        };
    } catch (error) {
        console.log("Lỗi khi tạo ngân sách:", error);
        return { success: false, message: error.message };
    }
};

const updateBudgetService = async (budgetId, userId, amount) => {
    try {
        // Lấy ngân sách cần cập nhật
        const budget = await Budget.findOne({ _id: budgetId, userId });
        if (!budget) {
            return { success: false, message: 'Ngân sách không tồn tại hoặc bạn không có quyền chỉnh sửa.' };
        }

        // Lấy tổng số dư của tất cả tài khoản
        const accounts = await Account.find({ userId }); // Sử dụng Account model để lấy danh sách tài khoản
        if (!accounts) {
            return { success: false, message: 'Không thể lấy danh sách tài khoản.' };
        }
        const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

        // Lấy danh sách ngân sách hiện tại của người dùng (trừ ngân sách đang sửa)
        const existingBudgets = await Budget.find({ userId, _id: { $ne: budgetId } });
        const totalExistingBudget = existingBudgets.reduce((sum, budget) => sum + budget.amount, 0);

        // Tính tổng ngân sách sau khi cập nhật
        const totalBudgetAfterUpdate = totalExistingBudget + amount;

        // Kiểm tra nếu tổng ngân sách vượt quá tổng số dư
        if (totalBudgetAfterUpdate > totalBalance) {
            return {
                success: false,
                EM: `Ngân sách đã vượt quá số dư nên không thể sửa được!`
            };
        }

        const category = await Categories.findById(budget.categoryId, 'name');
        if (!category) {
            return { success: false, message: 'Danh mục không tồn tại.' };
        }

        const oldSpentPercentage = (budget.spent / budget.amount) * 100;
        budget.amount = amount;
        await budget.save();

        const spentPercentage = (budget.spent / budget.amount) * 100;
        let notificationMessage = null;

        if (spentPercentage >= 100 && oldSpentPercentage < 100) {
            notificationMessage = `Bạn đã dùng hết ngân sách cho danh mục: ${category.name} sau khi cập nhật!`;
        } else if (spentPercentage >= 80 && spentPercentage <= 99 && oldSpentPercentage < 80) {
            notificationMessage = `Bạn sắp dùng hết ngân sách cho danh mục: ${category.name} sau khi cập nhật!`;
        } else if (spentPercentage > 50 && spentPercentage < 80 && oldSpentPercentage <= 50) {
            notificationMessage = `Bạn đã dùng hơn 1 nửa ngân sách cho danh mục: ${category.name} sau khi cập nhật!`;
        } else if (spentPercentage === 50 && oldSpentPercentage < 50) {
            notificationMessage = `Bạn đã dùng 1 nửa ngân sách cho danh mục: ${category.name} sau khi cập nhật!`;
        } else if (oldSpentPercentage >= 80 && spentPercentage < 80) {
            notificationMessage = `Ngân sách cho danh mục: ${category.name}: đã dưới 80% sau khi cập nhật!`;
        } else if (oldSpentPercentage > 50 && spentPercentage <= 50) {
            notificationMessage = `Ngân sách cho danh mục: ${category.name} đã dưới 50% sau khi cập nhật!`;
        }

        // Lưu thông báo vào database nếu có
        if (notificationMessage) {
            await createNotificationService(userId, notificationMessage);
        }

        return {
            success: true,
            message: 'Ngân sách đã được cập nhật',
            notificationMessage,
            budget: {
                ...budget._doc,
                categoryName: category.name,
                spentPercentage: spentPercentage.toFixed(2),
                remaining: budget.amount - budget.spent
            }
        };
    } catch (error) {
        console.log("Lỗi khi cập nhật ngân sách:", error);
        return { success: false, message: error.message };
    }
};

const deleteBudgetService = async (budgetId, userId) => {
    try {
        const budget = await Budget.findOneAndDelete({ _id: budgetId, userId });
        if (!budget) {
            throw new Error('Ngân sách không tồn tại hoặc bạn không có quyền xóa.');
        }

        return { success: true, message: 'Ngân sách đã được xóa' };
    } catch (error) {
        console.log("Lỗi khi xóa ngân sách:", error);
        return { success: false, message: error.message };
    }
};

const updateBudgetSpent = async (userId, categoryId, transactionAmount, transactionDate) => {
    try {
        const budget = await Budget.findOne({
            userId,
            categoryId,
            startDate: { $lte: transactionDate },
            endDate: { $gte: transactionDate }
        });

        if (budget) {
            const category = await Categories.findById(categoryId, 'name');
            if (!category) {
                throw new Error('Danh mục không tồn tại.');
            }

            const oldSpentPercentage = (budget.spent / budget.amount) * 100;
            budget.spent += transactionAmount;
            await budget.save();

            const spentPercentage = (budget.spent / budget.amount) * 100;
            let notificationMessage = null;

            if (spentPercentage >= 100 && oldSpentPercentage < 100) {
                notificationMessage = `Bạn đã dùng hết ngân sách cho danh mục: ${category.name}!`;
            } else if (spentPercentage >= 80 && spentPercentage <= 99 && oldSpentPercentage < 80) {
                notificationMessage = `Bạn sắp dùng hết ngân sách cho danh mục: ${category.name}!`;
            } else if (spentPercentage > 50 && spentPercentage < 80 && oldSpentPercentage <= 50) {
                notificationMessage = `Bạn đã dùng hơn 1 nửa ngân sách cho danh mục: ${category.name}!`;
            } else if (spentPercentage === 50 && oldSpentPercentage < 50) {
                notificationMessage = `Bạn đã dùng 1 nửa ngân sách cho danh mục: ${category.name}!`;
            }

            // Lưu thông báo vào database nếu có
            if (notificationMessage) {
                await createNotificationService(userId, notificationMessage);
            }

            return { notificationMessage }; // Trả về thông báo
        }
        return null;
    } catch (error) {
        console.log("Lỗi khi cập nhật ngân sách đã chi:", error);
        return null;
    }
};

const decreaseBudgetSpent = async (userId, categoryId, transactionAmount, transactionDate) => {
    try {
        const budget = await Budget.findOne({
            userId,
            categoryId,
            startDate: { $lte: transactionDate },
            endDate: { $gte: transactionDate }
        });

        if (budget) {
            const category = await Categories.findById(categoryId, 'name');
            if (!category) {
                throw new Error('Danh mục không tồn tại.');
            }

            const oldSpentPercentage = (budget.spent / budget.amount) * 100;
            budget.spent -= transactionAmount;
            if (budget.spent < 0) budget.spent = 0;
            await budget.save();

            const spentPercentage = (budget.spent / budget.amount) * 100;
            let notificationMessage = null;

            // if (oldSpentPercentage >= 100 && spentPercentage < 100) {
            //     notificationMessage = `Ngân sách cho danh mục ${category.name} đã dưới 100%!`;
            // } else if (oldSpentPercentage >= 80 && spentPercentage < 80) {
            //     notificationMessage = `Ngân sách cho danh mục ${category.name} đã dưới 80%!`;
            // } else if (oldSpentPercentage > 50 && spentPercentage <= 50) {
            //     notificationMessage = `Ngân sách cho danh mục ${category.name} đã dưới 50%!`;
            // }

            // Lưu thông báo vào database nếu có
            if (notificationMessage) {
                await createNotificationService(userId, notificationMessage);
            }

            return { notificationMessage }; // Trả về thông báo
        }
        return null;
    } catch (error) {
        console.log("Lỗi khi giảm ngân sách đã chi:", error);
        return null;
    }
};

module.exports = {
    getBudgetService,
    createBudgetService,
    updateBudgetService,
    deleteBudgetService,
    updateBudgetSpent,
    decreaseBudgetSpent
};