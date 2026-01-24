const mongoose = require('mongoose');

const AllocationSchema = new mongoose.Schema({
    year: { type: String, required: true }, // "2", "3", "4"
    subjectName: { type: String, required: true },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
    staffName: { type: String }, // Storing name denormalized for easier fetching if needed
});

// Compound unique index to prevent duplicate subject allocation for same year
AllocationSchema.index({ year: 1, subjectName: 1 }, { unique: true });

module.exports = mongoose.model('Allocation', AllocationSchema);
