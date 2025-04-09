const User = require('../models/User');

const adminMiddleware = async (req, res, next) => {
    try {
        // 1️⃣ Check if the user exists
        const user = await User.findById(req.userId);
        
        // 2️⃣ If no user or not an admin, deny access
        if (!user || !user.isAdmin) {
            return res.status(403).json({ message: "Access denied! Admins only." });
        }

        // 3️⃣ Allow the request to proceed
        next();
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = adminMiddleware;
