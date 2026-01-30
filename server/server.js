const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const connectDB = require('./db');
const User = require('./models/User');
const Student = require('./models/Student');
const Attendance = require('./models/Attendance');
const Staff = require('./models/Staff');
const Allocation = require('./models/Allocation');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect Database
connectDB();

app.use(cors());
app.use(bodyParser.json());

// === STATIC FILES (Securely serving frontend) ===
app.use(express.static(path.join(__dirname, '../')));
app.use('/server', (req, res) => res.status(403).send('Forbidden'));

// === AUTHENTICATION ===
const Session = require('./models/Session');
const crypto = require('crypto');

// ...

// === AUTHENTICATION ===
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username, password });
        if (user) {
            // Generate Token
            const token = crypto.randomBytes(32).toString('hex');

            // Create Session in DB
            await Session.create({
                token: token,
                username: user.username,
                role: user.role
            });

            res.json({ success: true, role: user.role, token: token, username: user.username });
        } else {
            res.status(401).json({ success: false, message: "Invalid credentials" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET Current User from Token
app.get('/api/me', async (req, res) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: "No token provided" });

    try {
        const session = await Session.findOne({ token });
        if (!session) return res.status(401).json({ error: "Invalid or expired session" });

        res.json({ username: session.username, role: session.role });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === STUDENTS ===
app.get('/api/students', async (req, res) => {
    try {
        const students = await Student.find();
        res.json(students);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/students', async (req, res) => {
    try {
        const newStudent = await Student.create(req.body);
        res.json(newStudent);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put('/api/students/:reg', async (req, res) => {
    try {
        await Student.findOneAndUpdate({ reg: req.params.reg }, req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/students/:reg', async (req, res) => {
    try {
        await Student.findOneAndDelete({ reg: req.params.reg });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === ATTENDANCE ===
app.get('/api/attendance', async (req, res) => {
    try {
        const records = await Attendance.find();
        // Transform: { date: { reg: status } }
        const formatted = {};
        records.forEach(row => {
            if (!formatted[row.date]) formatted[row.date] = {};
            formatted[row.date][row.student_reg] = row.status;
        });
        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/attendance', async (req, res) => {
    const { date, data } = req.body;
    // data is array of { reg, status, year }

    // Mongoose bulkWrite is efficient
    const ops = data.map(item => ({
        updateOne: {
            filter: { student_reg: item.reg, date: date },
            update: { $set: { status: item.status, year: item.year } },
            upsert: true
        }
    }));

    try {
        if (ops.length > 0) {
            await Attendance.bulkWrite(ops);
        }
        res.json({ success: true });
    } catch (err) {
        console.error("Attendance Error:", err);
        res.status(500).json({ error: err.message });
    }
});



// (cleaned up)

// ... (previous app setup)

// === STAFF ===
app.get('/api/staff', async (req, res) => {
    try {
        const staff = await Staff.find();
        res.json(staff);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/staff', async (req, res) => {
    try {
        const { staffId, name } = req.body;

        // Check if user (by Name) already exists
        const existingUser = await User.findOne({ username: name });
        if (existingUser) {
            return res.status(400).json({ error: "A user with this Name already exists. Please use a unique name." });
        }

        // Create Staff
        const newStaff = await Staff.create(req.body);

        // Create User Login (Auto)
        await User.create({
            username: name,   // Username is now Staff Name
            password: staffId, // Password is Staff ID
            role: 'staff'
        });

        res.json(newStaff);
    } catch (err) {
        // If it's a duplicate key error (11000)
        if (err.code === 11000) {
            return res.status(400).json({ error: "Staff ID or Email already exists." });
        }
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/staff/:id', async (req, res) => {
    try {
        const staffId = req.params.id;

        // Find Staff first to get the Name
        const staff = await Staff.findOne({ staffId });

        if (staff) {
            // Delete User Login (by Name)
            await User.findOneAndDelete({ username: staff.name });

            // Delete Staff
            await Staff.findOneAndDelete({ staffId });
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === ALLOCATIONS ===
app.get('/api/allocations', async (req, res) => {
    try {
        const allocations = await Allocation.find().populate('staff');
        res.json(allocations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/allocations', async (req, res) => {
    const { year, subjectName, staffId, staffName } = req.body;
    try {
        // Find staff to get ObjectId
        const staff = await Staff.findOne({ staffId });
        if (!staff) return res.status(404).json({ error: "Staff not found" });

        const allocation = await Allocation.findOneAndUpdate(
            { year, subjectName },
            { staff: staff._id, staffName }, // Store staffName for redundancy if needed
            { upsert: true, new: true }
        );
        res.json(allocation);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET Allocations for specific staff (by Name)
app.get('/api/allocations/staff/:name', async (req, res) => {
    try {
        const staffName = req.params.name;
        // Find allocations where staffName matches
        const allocations = await Allocation.find({ staffName: staffName });
        res.json(allocations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === TIMETABLE ===
const Timetable = require('./models/Timetable');

app.get('/api/timetable/:year', async (req, res) => {
    try {
        const timetable = await Timetable.findOne({ year: req.params.year });
        // Return empty object if not found, rather than 404, to simplify frontend logic
        res.json(timetable || { year: req.params.year, schedule: {} });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/timetable', async (req, res) => {
    const { year, schedule } = req.body;
    try {
        const timetable = await Timetable.findOneAndUpdate(
            { year },
            { schedule, lastUpdated: new Date() },
            { upsert: true, new: true }
        );
        res.json(timetable);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
