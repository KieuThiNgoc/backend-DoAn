const mongoose = require('mongoose')

const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    amount: Number,
    type: {
        type: String,
        enum: ['income', 'expense'],
    },
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Accounts',
        required: true,
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Categories',
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    description: {
        type: String,
        default: ''
    }
});

const Transactions = mongoose.model('Transactions', transactionSchema);

module.exports = Transactions;