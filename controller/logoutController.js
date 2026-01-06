//=============================
// File: logoutController.js
// Script that handles logout
//==========================

const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const logoutController = (sql) => {
    // POST route / (which will be mounted on /logout)
    router.post("/", async (req, res) => {
        console.log("[LOGOUT] Request received");
        // DEBUG: Print the origin and raw cookies received
        console.log("[LOGOUT] Origin:", req.headers.origin);
        console.log("[LOGOUT] Raw Cookie Header:", req.headers.cookie);

        const token = req.cookies.token; // Retrieve token from cookie
        
        if (!token) {
            console.log("[LOGOUT] No token found in cookies");
            return res.status(200).json({ message: "Logout successful (no token found)" });
        }

        try {
            // Verify token (synchronous to better handle async/await flow)
            const user = jwt.verify(token, process.env.JWT_SECRET || "segreto_super_sicuro_da_cambiare");

            console.log(`[LOGOUT] Valid token for user ID: ${user.id}`);

            // Update status in DB to 'U' (Unlogged)
            await sql`UPDATE utenti SET stato = 'U' WHERE id = ${user.id}`;
            console.log("[LOGOUT] User status updated in DB");

            // Clear HttpOnly cookie
            res.clearCookie("token", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
            });

            console.log("Logout successful"); // This will now appear in the console!
            return res.json({ message: "Logout successful" });

        } catch (error) {
            console.error("[LOGOUT] Error or token expired:", error.message);
            // In case of error (e.g. expired token), clear the cookie anyway
            res.clearCookie("token", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
            });
            return res.status(200).json({ message: "Logout successful (invalid token)" });
        }
    });

    return router;
};

module.exports = logoutController;
