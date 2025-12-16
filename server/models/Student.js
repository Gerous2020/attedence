const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    reg: { type: String, required: true, unique: true },
    year: { type: String, required: true },
    email: { type: String },
    gender: { type: String }
});

module.exports = mongoose.model('Student', studentSchema);
