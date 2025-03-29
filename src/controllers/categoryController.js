const { getCategoryService, createCategoryService, updateCategoryService, deleteCategoryService } = require("../services/categoryService");

const getCategories = async (req, res) => {
    const userId = req.user._id;
    const data = await getCategoryService(userId);
    return res.status(200).json(data);
};

const createCategories = async (req, res) => {
    const { name, type } = req.body;
    const userId = req.user._id;
    const data = await createCategoryService(userId, name, type);
    return res.status(200).json(data);
}

const updateCategories = async (req, res) => {
    const { categoryId, name, type } = req.body;
    const userId = req.user._id;
    const data = await updateCategoryService(categoryId, userId, name, type);
    return res.status(200).json(data);
};

const deleteCategories = async (req, res) => {
    const { categoryId } = req.body;
    const userId = req.user._id;
    const data = await deleteCategoryService(categoryId, userId);
    return res.status(200).json(data);
};

module.exports = {
    getCategories, createCategories, updateCategories, deleteCategories
}