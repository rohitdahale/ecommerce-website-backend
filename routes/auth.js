const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const protect = require('../middleware/authMiddleware'); // Import our protection middleware
const User = require('../models/User');
const BlacklistedToken = require('../models/Blacklistedtoken');
const adminMiddleware = require('../middleware/adminMiddleware'); // Admin protection
require('dotenv').config();

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { name, email, password, isAdmin } = req.body; // Include isAdmin field

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists!" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            isAdmin: isAdmin || false, // Set isAdmin field
        });

        await newUser.save();

        const token = jwt.sign(
            { id: newUser._id, isAdmin: newUser.isAdmin }, // Include isAdmin in JWT
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.status(201).json({
            message: "User registered successfully!",
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                isAdmin: newUser.isAdmin,
            },
            token,
        });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});


router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User not found!" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials!" });
        }

        const token = jwt.sign(
            { id: user._id, isAdmin: user.isAdmin }, // Include isAdmin
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.status(200).json({
            message: "Login successful!",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin, // Include isAdmin in response
            },
            token,
        });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});


router.get('/profile', protect, async (req, res) => {
    try {
        // Since the protect middleware already verified the token,
        // we can access the user ID from req.userId
        
        // Find the user by ID but exclude the password
        const user = await User.findById(req.userId).select('-password');
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        // Return safe user data (no password)
        res.json({
            id: user._id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt
        });
        
    } catch (error) {
        res.status(500).json({ 
            message: "Server error fetching profile",
            error: error.message 
        });
    }
});

router.put('/profile', protect, async (req, res) => {
    try {
        // 1️⃣ Get user from the database (using user ID from JWT)
        let user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found!" });
        }

        // 2️⃣ Update user details (only if provided in req.body)
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;

        // 3️⃣ Save the updated user **correctly**
        await user.save(); // This saves the changes in MongoDB

        // 4️⃣ Fetch the updated user from the database again
        const updatedUser = await User.findById(req.userId).select('-password');

        // 5️⃣ Return updated user details (without password)
        res.json({
            id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            message: "Profile updated successfully!"
        });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

router.put('/change-password', protect, async (req, res) => {
    try {
        // 1️⃣ Get old & new password from request body
        const { oldPassword, newPassword } = req.body;

        // 2️⃣ Validate input (Ensure both fields are provided)
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: "Both old and new passwords are required!" });
        }

        // 3️⃣ Find user by ID
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found!" });
        }

        // 4️⃣ Check if old password matches stored password
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Old password is incorrect!" });
        }

        // 5️⃣ Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // 6️⃣ Update the password & save
        user.password = hashedPassword;
        await user.save();

        // 7️⃣ Send success response
        res.json({ message: "Password changed successfully! 🎉" });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

router.post('/logout', protect, async (req, res) => {
    try{
        const token = req.header("Authorization").replace("Bearer ", "");

        // 2️⃣ Save token to the blacklist
        await BlacklistedToken.create({ token });

        // 3️⃣ Send success response
        res.json({ message: "Logged out successfully!" });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

router.get('/admin-dashboard', protect, adminMiddleware, (req, res) => {
    res.json({ message: "Welcome to the Admin Dashboard!" });
});

module.exports = router;