const express = require('express');
const router = express.Router();
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const protect = require('../middleware/authMiddleware');

// Get user's wishlist
router.get('/', protect, async (req, res) => {
  try {
    // Find wishlist by user ID
    let wishlist = await Wishlist.findOne({ user: req.userId })
      .populate({
        path: 'items',
        select: 'name price imageUrl category discount inStock'
      });
    
    // If wishlist doesn't exist yet, create an empty one
    if (!wishlist) {
      wishlist = {
        items: []
      };
    }
    
    res.json(wishlist);
  } catch (error) {
    res.status(500).json({ message: "Error fetching wishlist", error: error.message });
  }
});

// Add item to wishlist
router.post('/add', protect, async (req, res) => {
  try {
    const { productId } = req.body;
    
    // Validate input
    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }
    
    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    // Find user's wishlist or create new one
    let wishlist = await Wishlist.findOne({ user: req.userId });
    
    if (!wishlist) {
      // Create new wishlist if none exists
      wishlist = new Wishlist({
        user: req.userId,
        items: [productId]
      });
    } else {
      // Check if product already exists in wishlist
      const isItemInWishlist = wishlist.items.some(item => 
        item.toString() === productId
      );
      
      if (!isItemInWishlist) {
        // Product not in wishlist, add it
        wishlist.items.push(productId);
      } else {
        return res.status(200).json({ 
          message: "Product already in wishlist", 
          wishlist: await populateWishlist(wishlist) 
        });
      }
    }
    
    // Save wishlist
    await wishlist.save();
    
    // Populate product details and return wishlist
    const populatedWishlist = await populateWishlist(wishlist);
    
    res.status(200).json({
      message: "Product added to wishlist",
      wishlist: populatedWishlist
    });
  } catch (error) {
    res.status(500).json({ message: "Error adding item to wishlist", error: error.message });
  }
});

// Remove item from wishlist
router.delete('/remove/:productId', protect, async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Find user's wishlist
    let wishlist = await Wishlist.findOne({ user: req.userId });
    
    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }
    
    // Check if product exists in wishlist
    const itemIndex = wishlist.items.findIndex(item => 
      item.toString() === productId
    );
    
    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not found in wishlist" });
    }
    
    // Remove item
    wishlist.items.splice(itemIndex, 1);
    
    // Save wishlist
    await wishlist.save();
    
    // Populate product details and return wishlist
    const populatedWishlist = await populateWishlist(wishlist);
    
    res.status(200).json({
      message: "Product removed from wishlist",
      wishlist: populatedWishlist
    });
  } catch (error) {
    res.status(500).json({ message: "Error removing item from wishlist", error: error.message });
  }
});

// Check if product is in wishlist
router.get('/check/:productId', protect, async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Find user's wishlist
    const wishlist = await Wishlist.findOne({ user: req.userId });
    
    if (!wishlist) {
      return res.json({ isInWishlist: false });
    }
    
    // Check if product exists in wishlist
    const isInWishlist = wishlist.items.some(item => 
      item.toString() === productId
    );
    
    res.json({ isInWishlist });
  } catch (error) {
    res.status(500).json({ message: "Error checking wishlist", error: error.message });
  }
});

// Clear wishlist
router.delete('/clear', protect, async (req, res) => {
  try {
    // Find and update wishlist
    const wishlist = await Wishlist.findOneAndUpdate(
      { user: req.userId },
      { $set: { items: [] } },
      { new: true }
    );
    
    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }
    
    res.status(200).json({ message: "Wishlist cleared successfully", wishlist });
  } catch (error) {
    res.status(500).json({ message: "Error clearing wishlist", error: error.message });
  }
});

// Helper function to populate wishlist items
async function populateWishlist(wishlist) {
  return await Wishlist.findById(wishlist._id)
    .populate({
      path: 'items',
      select: 'name price imageUrl category discount inStock'
    });
}

module.exports = router;