const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const protect = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Create a new order (Buy Now functionality)
router.post('/', protect, async (req, res) => {
    try {
        const { 
            productId, 
            quantity, 
            shippingAddress,
            paymentMethod
        } = req.body;

        // Validate required fields
        if (!productId || !shippingAddress || !paymentMethod) {
            return res.status(400).json({ 
                message: "Product ID, shipping address, and payment method are required" 
            });
        }

        // Check if product exists and is in stock
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        if (!product.inStock) {
            return res.status(400).json({ message: "Product is out of stock" });
        }

        // Calculate total price
        const productPrice = product.price;
        const totalPrice = productPrice * (quantity || 1);

        // Create new order
        const newOrder = new Order({
            user: req.userId,
            products: [
                {
                    product: productId,
                    quantity: quantity || 1,
                    price: productPrice
                }
            ],
            shippingAddress,
            paymentMethod,
            totalPrice
        });

        const savedOrder = await newOrder.save();
        
        // Populate product details for response
        const populatedOrder = await Order.findById(savedOrder._id)
            .populate('products.product', 'name imageUrl');

        res.status(201).json({
            message: "Order placed successfully",
            order: populatedOrder
        });
    } catch (error) {
        res.status(500).json({ 
            message: "Error creating order", 
            error: error.message 
        });
    }
});

// NEW: Create order from cart
router.post('/from-cart', protect, async (req, res) => {
    try {
        const { shippingAddress, paymentMethod } = req.body;

        // Validate required fields
        if (!shippingAddress || !paymentMethod) {
            return res.status(400).json({ 
                message: "Shipping address and payment method are required" 
            });
        }

        // Find user's cart
        const cart = await Cart.findOne({ user: req.userId })
            .populate('items.product');

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ 
                message: "Your cart is empty" 
            });
        }

        // Check if all products are in stock
        const outOfStockItems = cart.items.filter(item => !item.product.inStock);
        if (outOfStockItems.length > 0) {
            return res.status(400).json({ 
                message: `Some items are out of stock: ${outOfStockItems.map(item => item.product.name).join(', ')}` 
            });
        }

        // Create order items from cart
        const orderItems = cart.items.map(item => ({
            product: item.product._id,
            quantity: item.quantity,
            price: item.product.price
        }));

        // Calculate total price
        const totalPrice = cart.items.reduce((total, item) => {
            return total + (item.product.price * item.quantity);
        }, 0);

        // Create new order
        const newOrder = new Order({
            user: req.userId,
            products: orderItems,
            shippingAddress,
            paymentMethod,
            totalPrice,
            // Apply shipping fee if total is less than 5000
            shippingFee: totalPrice > 5000 ? 0 : 100
        });

        const savedOrder = await newOrder.save();
        
        // Clear the cart after creating order
        await Cart.findOneAndUpdate(
            { user: req.userId },
            { $set: { items: [] } }
        );
        
        // Populate product details for response
        const populatedOrder = await Order.findById(savedOrder._id)
            .populate('products.product', 'name imageUrl');

        res.status(201).json({
            message: "Order created successfully from cart",
            order: populatedOrder
        });
    } catch (error) {
        res.status(500).json({ 
            message: "Error creating order from cart", 
            error: error.message 
        });
    }
});

// Get user's orders
router.get('/my-orders', protect, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.userId })
            .populate('products.product', 'name imageUrl price')
            .sort({ createdAt: -1 });

        res.json(orders);
    } catch (error) {
        res.status(500).json({ 
            message: "Error fetching orders", 
            error: error.message 
        });
    }
});

// Get order by ID
router.get('/:id', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email')
            .populate('products.product', 'name imageUrl price');

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Check if order belongs to user or user is admin
        if (order.user._id.toString() !== req.userId && !req.isAdmin) {
            return res.status(403).json({ message: "Not authorized to view this order" });
        }

        res.json(order);
    } catch (error) {
        res.status(500).json({ 
            message: "Error fetching order", 
            error: error.message 
        });
    }
});

// Update order to paid status
router.put('/:id/pay', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Ensure the order belongs to the user
        if (order.user.toString() !== req.userId) {
            return res.status(403).json({ message: "Not authorized to update this order" });
        }

        // Update payment information
        order.isPaid = true;
        order.paidAt = Date.now();
        order.paymentResult = {
            id: req.body.id,
            status: req.body.status,
            update_time: req.body.update_time,
            email_address: req.body.email_address
        };
        order.status = 'confirmed';

        const updatedOrder = await order.save();

        res.json({
            message: "Order marked as paid",
            order: updatedOrder
        });
    } catch (error) {
        res.status(500).json({ 
            message: "Error updating payment status", 
            error: error.message 
        });
    }
});

// Update order with manual UPI payment
router.put('/:id/manual-pay', protect, async (req, res) => {
    try {
        const { transactionId, screenshotUrl } = req.body;

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Only the owner of the order can update
        if (order.user.toString() !== req.userId) {
            return res.status(403).json({ message: "Not authorized to update this order" });
        }

        // Check if it's already paid
        if (order.isPaid) {
            return res.status(400).json({ message: "Order is already marked as paid" });
        }

        order.paymentMethod = 'UPI';
        order.paymentProof = transactionId || screenshotUrl;
        order.status = 'processing'; // You manually confirm later
        await order.save();

        res.json({
            message: "Payment proof submitted successfully. We'll verify it soon.",
            order
        });
    } catch (error) {
        res.status(500).json({
            message: "Error submitting payment proof",
            error: error.message
        });
    }
});

// Cancel order (user can only cancel if not shipped)
router.put('/:id/cancel', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Ensure the order belongs to the user
        if (order.user.toString() !== req.userId) {
            return res.status(403).json({ message: "Not authorized to cancel this order" });
        }

        // Check if order can be cancelled
        if (order.status === 'shipped' || order.status === 'delivered') {
            return res.status(400).json({ 
                message: "Cannot cancel order that has been shipped or delivered" 
            });
        }

        order.status = 'cancelled';
        const updatedOrder = await order.save();

        res.json({
            message: "Order cancelled successfully",
            order: updatedOrder
        });
    } catch (error) {
        res.status(500).json({ 
            message: "Error cancelling order", 
            error: error.message 
        });
    }
});

// Admin Routes
// Get all orders (Admin Only)
router.get('/', protect, adminMiddleware, async (req, res) => {
    try {
        const orders = await Order.find({})
            .populate('user', 'name email')
            .populate('products.product', 'name')
            .sort({ createdAt: -1 });

        res.json(orders);
    } catch (error) {
        res.status(500).json({ 
            message: "Error fetching orders", 
            error: error.message 
        });
    }
});

// Update order status (Admin Only)
router.put('/:id/status', protect, adminMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        
        if (!status || !['processing', 'confirmed', 'shipped', 'delivered', 'cancelled'].includes(status)) {
            return res.status(400).json({ message: "Valid status is required" });
        }

        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        order.status = status;
        
        // Update additional fields based on status
        if (status === 'delivered') {
            order.isDelivered = true;
            order.deliveredAt = Date.now();
        }

        const updatedOrder = await order.save();

        res.json({
            message: "Order status updated successfully",
            order: updatedOrder
        });
    } catch (error) {
        res.status(500).json({ 
            message: "Error updating order status", 
            error: error.message 
        });
    }
});

module.exports = router;