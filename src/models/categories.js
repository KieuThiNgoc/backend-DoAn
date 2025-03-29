const mongoose = require('mongoose')

const categorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    name: String,
    type: {
        type: String,
        enum: ['income', 'expense'],
    }
});

const Categories = mongoose.model('Categories', categorySchema);

module.exports = Categories;