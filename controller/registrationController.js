const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const router = express.Router();

const SALT_ROUNDS = 10; // Number of cycles for hashing. 10 is a good starting point.

/**
 * Creates and configures the router for the registration route.
 * @param {object} sql - The database client instance (e.g. neon).
 * @returns {object} The configured Express router.
 */
const registrationController = (sql) => {
    router.post("/", async (req, res) => {
        const { username, password } = req.body || {}

        if (!username || !password) {
            return res
                .status(400)
                .json({ error: "Username and password are required" })
        }

        try {
            // 1. Check if user already exists
            const existingUser =
                await sql`SELECT id FROM utenti WHERE username = ${username}`

            if (existingUser.length > 0) {
                return res.status(409).json({ error: "Username already in use" })
            }

            // 2. Hash the password
            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

            // 3. Insert the new user into the database
            const result =
                await sql`INSERT INTO utenti (username, pwd, stato, ruolo) VALUES (${username}, ${hashedPassword}, 'U', 'user') RETURNING id, username, stato, ruolo`; // default status U, websocket will handle it

            const utente = result[0]

            // Generate JWT Token (same mechanism as Login)
            const token = jwt.sign(
                { id: utente.id, username: utente.username, ruolo: utente.ruolo },
                process.env.JWT_SECRET || "segreto_super_sicuro_da_cambiare",
                { expiresIn: "1h" }
            );

            // Set HttpOnly cookie
            res.cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                maxAge: 3600000,
                sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
            });

            // 4. Return a success response
            return res.status(201).json({
                message: "User registered successfully",
                user: utente,
            });
        } catch (err) {
            console.error("Error during registration:", err);
            return res.status(500).json({ error: "Internal server error" })
        }
    });

    return router
};

module.exports = registrationController