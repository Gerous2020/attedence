const mongoose = require('mongoose');
const User = require('./models/User');
const path = require('path');
// Explicitly load .env from the server directory
const envPath = path.join(__dirname, '.env');
const result = require('dotenv').config({ path: envPath });

if (result.error) {
    console.log(`⚠️  Dotenv Error: ${result.error.message}`);
}

const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI;

        console.log('--- DEBUG INFO ---');
        console.log(`Looking for .env at: ${envPath}`);
        if (!uri) {
            console.log('⚠️  No MONGO_URI found in process.env');
            if (result.parsed) {
                console.log('File was parsed but might be empty or malformed.');
                console.log('Parsed content keys:', Object.keys(result.parsed));
            }
        } else {
            // Mask password for safety in logs
            const masked = uri.replace(/:([^:@]+)@/, ':****@');
            console.log(`✅  Found URI: ${masked}`);
        }
        console.log('------------------');

        // Fallback to local
        const connectionString = uri || "mongodb://127.0.0.1:27017/attendance_system";

        await mongoose.connect(connectionString);
        console.log('✅ Connected to MongoDB');

        // Seed Users if empty
        try {
            const count = await User.countDocuments();
            if (count === 0) {
                console.log('Seeding initial users...');
                await User.create([
                    { username: 'admin', password: 'admin123', role: 'admin' },
                    { username: 'staff', password: 'staff123', role: 'staff' }
                ]);
                console.log('Users seeded.');
            }
        } catch (seedErr) {
            console.log("Seeding skipped/failed (non-fatal):", seedErr.message);
        }

    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err.message);
    }
};

module.exports = connectDB;
