const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const protect = require('../middleware/authMiddleware');

// Get user's cart
router.get('/', protect, async (req, res) => {
  try {
    // Find cart by user ID
    let cart = await Cart.findOne({ user: req.userId })
      .populate({
        path: 'items.product',
        select: 'name price imageUrl category discount'
      });
    
    // If cart doesn't exist yet, create an empty one
    if (!cart) {
      cart = {
        items: [],
        total: 0
      };
    } else {
      // Calculate total price
      cart = cart.toObject();
      cart.total = cart.items.reduce((sum, item) => {
        return sum + (item.product.price * item.quantity);
      }, 0);
    }
    
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: "Error fetching cart", error: error.message });
  }
});

// Add item to cart
router.post('/add', protect, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    
    // Validate input
    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }
    
    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    // Find user's cart or create new one
    let cart = await Cart.findOne({ user: req.userId });
    
    if (!cart) {
      // Create new cart if none exists
      cart = new Cart({
        user: req.userId,
        items: [{ product: productId, quantity: quantity || 1 }]
      });
    } else {
      // Check if product already exists in cart
      const itemIndex = cart.items.findIndex(item => 
        item.product.toString() === productId
      );
      
      if (itemIndex > -1) {
        // Product exists in cart, update quantity
        cart.items[itemIndex].quantity += (quantity || 1);
      } else {
        // Product not in cart, add new item
        cart.items.push({ product: productId, quantity: quantity || 1 });
      }
    }
    
    // Save cart
    await cart.save();
    
    // Populate product details and return cart
    await cart.populate({
      path: 'items.product',
      select: 'name price imageUrl category discount'
    });
    
    // Calculate total price
    const cartObj = cart.toObject();
    cartObj.total = cartObj.items.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity);
    }, 0);
    
    res.status(200).json(cartObj);
  } catch (error) {
    res.status(500).json({ message: "Error adding item to cart", error: error.message });
  }
});

// Update cart item quantity
router.put('/update', protect, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    
    // Validate input
    if (!productId || !quantity) {
      return res.status(400).json({ message: "Product ID and quantity are required" });
    }
    
    // Find user's cart
    let cart = await Cart.findOne({ user: req.userId });
    
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }
    
    // Find item in cart
    const itemIndex = cart.items.findIndex(item => 
      item.product.toString() === productId
    );
    
    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not found in cart" });
    }
    
    // Update quantity or remove item if quantity is 0
    if (quantity > 0) {
      cart.items[itemIndex].quantity = quantity;
    } else {
      cart.items.splice(itemIndex, 1);
    }
    
    // Save cart
    await cart.save();
    
    // Populate product details and return cart
    await cart.populate({
      path: 'items.product',
      select: 'name price imageUrl category discount'
    });
    
    // Calculate total price
    const cartObj = cart.toObject();
    cartObj.total = cartObj.items.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity);
    }, 0);
    
    res.status(200).json(cartObj);
  } catch (error) {
    res.status(500).json({ message: "Error updating cart", error: error.message });
  }
});

// Remove item from cart
router.delete('/remove/:productId', protect, async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Find user's cart
    let cart = await Cart.findOne({ user: req.userId });
    
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }
    
    // Find item in cart
    const itemIndex = cart.items.findIndex(item => 
      item.product.toString() === productId
    );
    
    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not found in cart" });
    }
    
    // Remove item
    cart.items.splice(itemIndex, 1);
    
    // Save cart
    await cart.save();
    
    // Populate product details and return cart
    await cart.populate({
      path: 'items.product',
      select: 'name price imageUrl category discount'
    });
    
    // Calculate total price
    const cartObj = cart.toObject();
    cartObj.total = cartObj.items.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity);
    }, 0);
    
    res.status(200).json(cartObj);
  } catch (error) {
    res.status(500).json({ message: "Error removing item from cart", error: error.message });
  }
});

// Clear cart
router.delete('/clear', protect, async (req, res) => {
  try {
    // Find and update cart
    const cart = await Cart.findOneAndUpdate(
      { user: req.userId },
      { $set: { items: [] } },
      { new: true }
    );
    
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }
    
    res.status(200).json({ message: "Cart cleared successfully", cart });
  } catch (error) {
    res.status(500).json({ message: "Error clearing cart", error: error.message });
  }
});

module.exports = router;