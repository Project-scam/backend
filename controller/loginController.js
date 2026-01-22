const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware");

/**
 * Validates if a string is a valid email format.
 * @param {string} email - The email string to validate.
 * @returns {boolean} True if valid email format, false otherwise.
 */
const isValidEmail = (email) => {
  // RFC 5322 compliant email regex
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
};

/**
 * Creates and configures the router for the login route.
 * @param {object} sql - The database client instance (e.g. neon).
 * @returns {object} The configured Express router.
 */
const loginController = (sql) => {
  // Route to verify session on page load
  // GET /login/verify
  router.get("/verify", async (req, res) => {
    const token = req.cookies.token;

    if (!token) {
      return res.json({ user: null });
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "segreto_super_sicuro_da_cambiare"
      );

      // Verify that the user still exists in the database
      const result =
        await sql`SELECT id, email, ruolo, stato, username FROM utenti WHERE id = ${decoded.id}`;

      if (result.length === 0) {
        // Utente non più presente nel database, pulisci il cookie
        console.log(
          "[VERIFY] Utente non più presente nel database, pulisci il cookie"
        );
        res.clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        });
        return res.json({ user: null });
      }

      const utente = result[0];
      res.json({
        user: {
          id: utente.id,
          email: utente.email,
          ruolo: utente.ruolo,
          username: utente.username,
          stato: utente.stato
        }
      });
    } catch (err) {
      // Invalid or expired token - clear the cookie
      res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      });
      res.json({ user: null });
    }
  });

  // User login
  // The route is POST / since the /login prefix will be used in index.js
  router.post("/", async (req, res) => {
    console.log("[LOGIN] Request received");
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Validate that email is a valid email format
    if (!isValidEmail(email)) {
      return res
        .status(400)
        .json({ error: "email must be a valid email address" });
    }

    try {
      // Search for user by email
      const result =
        await sql`SELECT id, email, pwd, stato, ruolo, username FROM utenti WHERE email = ${email}`;

      if (result.length === 0) {
        console.log("[LOGIN] User not found:", email);
        // Generic message to avoid revealing whether the user exists or not
        return res.status(401).json({ error: "Invalid credentials!!" });
      }

      const utente = result[0];

      // Compare the provided password with the hash saved in the DB
      const passwordMatch = await bcrypt.compare(password, utente.pwd);
      if (!passwordMatch) {
        console.log("[LOGIN] Wrong password for:", email);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      await sql`update utenti set stato = 'L' where id= ${utente.id}`;

      // Generate JWT Token for session management
      const token = jwt.sign(
        { id: utente.id, email: utente.email, ruolo: utente.ruolo },
        process.env.JWT_SECRET || "segreto_super_sicuro_da_cambiare",
        { expiresIn: "1h" }
      );
      console.log("[LOGIN] Token generated successfully");

      const isProduction = process.env.NODE_ENV === "production";
      console.log(
        `[LOGIN] Cookie Configuration - Production: ${isProduction}, SameSite: ${isProduction ? "none" : "lax"
        }`
      );

      // Set HttpOnly cookie
      res.cookie("token", token, {
        httpOnly: true, // Essential: prevents access via JS
        secure: isProduction, // Use HTTPS in production
        maxAge: 3600000, // 1 hour in milliseconds
        sameSite: isProduction ? "none" : "lax", // "none" for cross-site (Vercel->Render), "lax" for localhost
      });
      console.log("[LOGIN] HttpOnly cookie set in response");

      // Login success: returns a message and user data (without password)
      return res.json({
        message: "Login successful",
        user: {
          id: utente.id,
          email: utente.email,
          stato: "L",
          ruolo: utente.ruolo,
          username: utente.username,
        },
      });
    } catch (err) {
      console.error("Error during login:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
};

module.exports = loginController;
