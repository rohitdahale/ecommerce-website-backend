const mongoose = require('mongoose');
require('dotenv').config(); // Ensure dotenv is loaded

const MONGO_URI = process.env.MONGO_URI; // Read from .env

if (!MONGO_URI) {
    console.error("❌ MONGO_URI is undefined. Check your .env file.");
    process.exit(1);
}

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log("✅ MongoDB Connected Successfully");
    } catch (error) {
        console.error("❌ MongoDB Connection Failed:", error);
        process.exit(1);
    }
};

module.exports = connectDB;
