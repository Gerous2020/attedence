const mongoose = require('mongoose');

const StaffSchema = new mongoose.Schema({
    staffId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    department: { type: String, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    designation: { type: String, default: 'Professor' },
});

module.exports = mongoose.model('Staff', StaffSchema);
