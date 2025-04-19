const express = require('express');
const connectDB = require('./config/db');
require('dotenv').config();
const cors = require("cors");

const app = express();
app.use(express.json()); // Middleware to parse JSON requests

// ✅ Allow requests from frontend (http://localhost:5173)
app.use(cors({
    origin: "http://localhost:5173",  // Allow frontend requests
    methods: ["GET", "POST", "PUT", "DELETE"], // Allowed request methods
    credentials: true // Allow cookies if needed
}));

connectDB(); // Connect to MongoDB

// ✅ API Routes
app.use('/api/auth', require('./routes/auth'));  // Authentication Routes
app.use('/api/admin', require('./routes/adminRoutes')); // Admin Routes
app.use('/api/products', require('./routes/productRoutes')); // Product Routes (For Users)
app.use('/api/orders', require('./routes/orderRoutes')); // Order Routes (New)
app.use('/api/cart', require('./routes/cartRoutes')); // Cart Routes (New)
app.use('/api/wishlist', require('./routes/wishlistRoutes')); // Wishlist Routes

// ✅ Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Something went wrong!", error: err.message });
});

// ✅ Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});