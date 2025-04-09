const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true, // Fixed typo
    },
    email: {
        type: String,
        required: true,
        unique: true, // Ensure email is unique
    },
    password: {
        type: String,
        required: true,
    },
    isAdmin: {
        type: Boolean,
        default: false, // New field: Default is false (normal users)
    },
},  { timestamps: true });

// Corrected export (Create "User" model from schema)
module.exports = mongoose.model("User", userSchema);
