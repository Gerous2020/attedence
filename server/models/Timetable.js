const mongoose = require('mongoose');

// Structure:
// year: "2", "3", "4"
// schedule: {
//    Mon: [ { subject: "Maths", staffName: "Prof A", type: "theory" }, ... ],
//    Tue: ...
// }
const TimetableSchema = new mongoose.Schema({
    year: { type: String, required: true, unique: true },
    schedule: { type: Object, default: {} },
    lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Timetable', TimetableSchema);
