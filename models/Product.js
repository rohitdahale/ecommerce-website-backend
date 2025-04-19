const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
    {
        name: { 
            type: String, 
            required: true,
            trim: true
        },
        description: { 
            type: String, 
            required: true 
        },
        price: { 
            type: Number, 
            required: true,
            min: 0
        },
        category: { 
            type: String, 
            required: true,
            enum: ['rings', 'necklaces', 'earrings', 'bracelets', 'watches', 'bangles', 'other']
        },
        imageUrl: { 
            type: String, 
            required: true 
        },
        discount: {
            type: String,
            default: "0%"
        },
        rating: {
            type: Number,
            default: 5,
            min: 0,
            max: 5
        },
        reviews: {
            type: Number,
            default: 0
        },
        inStock: {
            type: Boolean,
            default: true
        },
        featured: {
            type: Boolean,
            default: false
        },
        createdBy: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "User", 
            required: true 
        }
    },
    { timestamps: true }
);

// Add index for faster searches
productSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model("Product", productSchema);