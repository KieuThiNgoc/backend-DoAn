const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    name: String,
    balance: {
        type: Number,
        default: 0
    },
    isCash: {
        type: Boolean,
        default: false
    }
});

const Accounts = mongoose.model('Accounts', accountSchema);

module.exports = Accounts;