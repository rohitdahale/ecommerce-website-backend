const jwt = require('jsonwebtoken');
const BlacklistedToken = require('../models/Blacklistedtoken');
require('dotenv').config();

const protect = async (req, res, next) => {
    try {
        // 1️⃣ Get token from request header
        const token = req.header("Authorization")?.replace("Bearer ", "");
        if (!token) {
            return res.status(401).json({ message: "No token, authorization denied!" });
        }
/* The code snippet `// 2️⃣ Check if the token is blacklisted` is checking if the JWT token extracted
from the request header is blacklisted. This is an important security measure to prevent the use of
revoked or compromised tokens for authentication. */

        // 2️⃣ Check if the token is blacklisted
        const blacklisted = await BlacklistedToken.findOne({ token });
        if (blacklisted) {
            return res.status(401).json({ message: "Token is invalid. Please log in again!" });
        }

        // 3️⃣ Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;

        next(); // ✅ Proceed to next middleware
    } catch (error) {
        res.status(401).json({ message: "Invalid token!" });
    }
};


module.exports = protect;