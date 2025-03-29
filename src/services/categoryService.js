const Categories = require("../models/categories")
const Transactions = require("../models/transactions")

const getCategoryService = async (userId) => {
    try {
        let result = await Categories.find({ userId });
        return result;
    } catch (error) {
        console.log(error);
        return null;
    }
};

const createCategoryService = async (userId, name, type) => {
    try {
        if (!['income', 'expense'].includes(type)) {
            return {
                EC: 2,
                EM: "Loại danh mục không hợp lệ!"
            };
        }

        const existingCategory = await Categories.findOne({
            userId: userId,
            name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
            type: type
        });

        if (existingCategory) {
            return {
                EC: 1,
                EM: "Danh mục này đã tồn tại!"
            };
        }

        const newCategory = await Categories.create({
            userId: userId,
            name: name,
            type: type
        });

        return {
            EC: 0,
            EM: "Tạo danh mục thành công!",
            DT: newCategory
        };
    } catch (error) {
        console.log(error);
        return null;
    }
}

const updateCategoryService = async (categoryId, userId, name, type) => {
    try {
        const category = await Categories.findOne({ _id: categoryId, userId: userId });
        if (!category) {
            return {
                EC: 3,
                EM: "Danh mục không tồn tại hoặc bạn không có quyền sửa!"
            };
        }

        if (!['income', 'expense'].includes(type)) {
            return {
                EC: 2,
                EM: "Loại danh mục không hợp lệ!"
            };
        }

        const existingCategory = await Categories.findOne({
            userId: userId,
            name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
            type: type,
            _id: { $ne: categoryId } // Loại trừ category hiện tại
        });

        if (existingCategory) {
            return {
                EC: 1,
                EM: "Tên danh mục này đã tồn tại!"
            };
        }

        const updatedCategory = await Categories.findByIdAndUpdate(
            categoryId,
            {
                name: name,
                type: type
            },
            { new: true }
        );

        return {
            EC: 0,
            EM: "Cập nhật danh mục thành công!",
            DT: updatedCategory
        };
    } catch (error) {
        console.log(error);
        return null;
    }
};

const deleteCategoryService = async (categoryId, userId) => {
    try {
        // Kiểm tra danh mục tồn tại và thuộc về user
        const category = await Categories.findOne({ _id: categoryId, userId: userId });
        if (!category) {
            return {
                EC: 1,
                EM: "Danh mục không tồn tại hoặc bạn không có quyền xóa!"
            };
        }

        // Kiểm tra xem danh mục có giao dịch liên quan hay không
        const transactionExists = await Transactions.findOne({ categoryId: categoryId });
        if (transactionExists) {
            return {
                EC: 4,
                EM: "Không thể xóa danh mục vì đã có giao dịch liên quan!"
            };
        }

        // Xóa danh mục nếu không có giao dịch liên quan
        await Categories.findByIdAndDelete(categoryId);

        return {
            EC: 0,
            EM: "Xóa danh mục thành công!"
        };
    } catch (error) {
        console.log(error);
        return null;
    }
};

module.exports = {
    getCategoryService, createCategoryService, updateCategoryService, deleteCategoryService
}