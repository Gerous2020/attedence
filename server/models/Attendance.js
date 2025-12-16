const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    student_reg: { type: String, required: true }, // Foreign key reference (logical)
    date: { type: String, required: true }, // 'YYYY-MM-DD'
    status: { type: String, required: true }, // 'Present' or 'Absent'
    year: { type: String }
});

// Composite unique index to ensure one status per student per day
attendanceSchema.index({ student_reg: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
