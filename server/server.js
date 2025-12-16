const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const connectDB = require('./db');
const User = require('./models/User');
const Student = require('./models/Student');
const Attendance = require('./models/Attendance');

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
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username, password });
        if (user) {
            res.json({ success: true, role: user.role });
        } else {
            res.status(401).json({ success: false, message: "Invalid credentials" });
        }
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


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
