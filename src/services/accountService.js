const Account = require('../models/accounts');
const Transactions = require("../models/transactions");

const createAccountService = async (userId, name, balance = 0, isCash = false) => {
    try {
        if (balance < 0) {
            return {
                EC: 2,
                EM: "Số dư tài khoản không được nhỏ hơn 0!"
            };
        }

        const existingAccount = await Account.findOne({
            userId: userId,
            name: { $regex: new RegExp(`^${name}$`, "i") }
        });

        if (existingAccount) {
            return {
                EC: 1,
                EM: "Tài khoản này đã tồn tại!"
            };
        }

        const newAccount = await Account.create({
            userId: userId,
            name: name,
            balance: balance,
            isCash: isCash
        });

        return {
            EC: 0,
            EM: "Tạo tài khoản thành công!",
            data: newAccount
        };
    } catch (error) {
        console.log(error);
        return null;
    }
};

const getAccountService = async (userId) => {
    try {
        let result = await Account.find({ userId });
        return result;
    } catch (error) {
        console.log(error);
        return null;
    }
};

const updateAccountService = async (accountId, userId, name, isCash) => {
    try {
        const account = await Account.findOne({ _id: accountId, userId: userId });
        if (!account) {
            return {
                EC: 3,
                EM: "Tài khoản không tồn tại hoặc bạn không có quyền sửa!"
            };
        }

        const existingAccount = await Account.findOne({
            userId: userId,
            name: { $regex: new RegExp(`^${name}$`, "i") },
            _id: { $ne: accountId }
        });

        if (existingAccount) {
            return {
                EC: 1,
                EM: "Tên tài khoản này đã tồn tại!"
            };
        }

        // Kiểm tra nếu chuyển từ offline sang online và số dư < 0
        if (account.isCash === true && isCash === false && account.balance < 0) {
            return {
                EC: 5,
                EM: "Không thể chuyển sang tài khoản online vì số dư đang nhỏ hơn 0!"
            };
        }

        const updatedAccount = await Account.findByIdAndUpdate(
            accountId,
            {
                name: name,
                isCash: isCash
            },
            { new: true }
        );

        return {
            EC: 0,
            EM: "Cập nhật tài khoản thành công!",
            data: updatedAccount
        };
    } catch (error) {
        console.log(error);
        return null;
    }
};

const deleteAccountService = async (accountId, userId) => {
    try {
        // Kiểm tra tài khoản tồn tại và thuộc về user
        const account = await Account.findOne({ _id: accountId, userId: userId });
        if (!account) {
            return {
                EC: 3,
                EM: "Tài khoản không tồn tại hoặc bạn không có quyền xóa!"
            };
        }

        // Kiểm tra xem tài khoản có giao dịch liên quan hay không
        const transactionExists = await Transactions.findOne({ accountId: accountId });
        if (transactionExists) {
            return {
                EC: 4,
                EM: "Không thể xóa tài khoản vì đã có giao dịch liên quan!"
            };
        }

        // Xóa tài khoản nếu không có giao dịch liên quan
        await Account.findByIdAndDelete(accountId);

        return {
            EC: 0,
            EM: "Xóa tài khoản thành công!"
        };
    } catch (error) {
        console.log(error);
        return null;
    }
};

module.exports = {
    createAccountService, getAccountService, updateAccountService, deleteAccountService
};