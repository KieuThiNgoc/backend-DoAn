const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Categories',
        required: true,
    },
    amount: Number,
    startDate: Date,
    endDate: Date,
    spent: {
        type: Number,
        default: 0
    }
});

const Budgets = mongoose.model('Budgets', budgetSchema);

module.exports = Budgets;