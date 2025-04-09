const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const protect = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { upload } = require("../config/cloudinary");



// ✅ Get all users (Admin Only)
router.get('/users', protect, adminMiddleware, async (req, res) => {
    try {
        const users = await User.find().select('-password'); // Exclude passwords
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// ✅ Update a user (Admin Only)
router.put('/users/:id', protect, adminMiddleware, async (req, res) => {
    try {
        const { name, email, isAdmin } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { name, email, isAdmin },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found!" });
        }

        res.json({ message: "User updated successfully!", updatedUser });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// ✅ Delete a user (Admin Only)
router.delete('/users/:id', protect, adminMiddleware, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({ message: "User not found!" });
        }

        res.json({ message: "User deleted successfully!" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// ✅ Add a new product (Admin Only)
// ✅ Add a new product (Admin Only)
router.post(
    "/products",
    protect,
    adminMiddleware,
    upload.single("image"), // image must be the input field name
    async (req, res) => {
      try {
        const { name, description, price, category } = req.body;
  
        if (!req.file || !name || !description || !price || !category) {
          return res.status(400).json({ message: "All fields including image are required" });
        }
  
        const newProduct = new Product({
          name,
          description,
          price,
          category,
          imageUrl: req.file.path, // Cloudinary hosted URL
          createdBy: req.userId,
        });
  
        await newProduct.save();
  
        res.status(201).json({
          message: "Product created successfully",
          product: newProduct,
        });
      } catch (error) {
        res.status(500).json({ message: "Error uploading product", error: error.message });
      }
    }
  );
  

// ✅ Get all products (Admin Only)
router.get('/products', protect, adminMiddleware, async (req, res) => {
    try {
        // 🔹 Step 1: Fetch all products from the database
        const products = await Product.find();

        // 🔹 Step 2: Return the product list
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// ✅ Update a product (Admin Only)
router.put('/products/:id', protect, adminMiddleware, async (req, res) => {
    try {
        const { name, description, price, category, imageUrl } = req.body;

        // 🔹 Step 1: Find the product by ID and update
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            { name, description, price, category, imageUrl },
            { new: true, runValidators: true }
        );

        // 🔹 Step 2: If product not found, return error
        if (!updatedProduct) {
            return res.status(404).json({ message: "Product not found!" });
        }

        // 🔹 Step 3: Return the updated product
        res.json({ message: "Product updated successfully!", updatedProduct });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// ✅ Delete a product (Admin Only)
router.delete('/products/:id', protect, adminMiddleware, async (req, res) => {
    try {
        // 🔹 Step 1: Find the product by ID and delete it
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);

        // 🔹 Step 2: If product not found, return error
        if (!deletedProduct) {
            return res.status(404).json({ message: "Product not found!" });
        }

        // 🔹 Step 3: Return success message
        res.json({ message: "Product deleted successfully!" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});


module.exports = router;
