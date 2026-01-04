const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    // Retrieve token from request cookies (thanks to cookie-parser)
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: "Access denied: Authentication required" });
    }

    try {
        // Verify token using the same secret key defined in loginController
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "segreto_super_sicuro_da_cambiare"
        );
        req.user = decoded; // Adds decoded user data to the req object
        next(); // Passes control to the next route
    } catch (err) {
        return res.status(403).json({ error: "Invalid or expired token" });
    }
};

module.exports = authMiddleware;
