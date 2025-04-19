const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const protect = require('../middleware/authMiddleware');
const { upload } = require("../config/cloudinary");

// ✅ Get all products with pagination, search, and filtering
router.get('/', async (req, res) => {
    try {
        let { page = 1, limit = 10, search = '', category = '', sort = 'createdAt', order = 'desc' } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);
        
        // Build query object
        const query = {};
        if (search) {
            query.name = { $regex: search, $options: 'i' }; // Case-insensitive search
        }
        if (category) {
            query.category = category;
        }
        
        // Build sort object
        const sortOption = {};
        sortOption[sort] = order === 'desc' ? -1 : 1;
        
        const products = await Product.find(query)
            .sort(sortOption)
            .limit(limit)
            .skip((page - 1) * limit);
        
        const total = await Product.countDocuments(query);
        
        res.json({
            products,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// ✅ Get featured products for dashboard
// ✅ Get featured products
router.get('/featured', async (req, res) => {
    try {
        const featuredProducts = await Product.find({ featured: true }) // <-- ✅ Filter only featured
            .sort({ createdAt: -1 })
            .limit(4);
        res.json(featuredProducts);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});


// ✅ Get products by category (for dashboard category sections)
router.get('/category/:categoryName', async (req, res) => {
    try {
        const { categoryName } = req.params;
        const products = await Product.find({ category: categoryName })
            .sort({ createdAt: -1 })
            .limit(6);
        
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// ✅ Get a single product by ID
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ message: "Product not found!" });
        }
        
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

module.exports = router;