const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const connectDB = async () => {
    try {
        // Fallback to local if no ENV provided (for dev), but cloud is preferred
        const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/attendance_system";

        await mongoose.connect(uri);
        console.log('✅ Connected to MongoDB');

        // Seed Users if empty
        const count = await User.countDocuments();
        if (count === 0) {
            console.log('Seeding initial users...');
            await User.create([
                { username: 'admin', password: 'admin123', role: 'admin' },
                { username: 'staff', password: 'staff123', role: 'staff' }
            ]);
            console.log('Users seeded.');
        }

    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err.message);
        // Do not exit process, let it retry or run without DB implies failure
    }
};

module.exports = connectDB;
