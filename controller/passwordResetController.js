//=====================================================
// File: passwordResetController.js
// Controller per gestione del reset della password
// @authors: catalin.groppo@allievi.itsdigitalacademy.com
//           andrea.villari@allievi.itsdigitalacademy.com
//           mattia.zara@allievi.itsdigitalacademy.com
//           sandu.batrincea@allievi.itsdigitalacademy.com
// @version: 1.0.0.0 2026-01-12
//=====================================================

const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const router = express.Router();
const transporter = require("../services/mailer");
const { FRONTEND_URL } = require("../config");

const SALT_ROUNDS = 10; // Numero di cicli per l'hashing della password

/**
 * Validazione se la stringa ha un formato email valido.
 * @param {string} email - La stringa da validare.
 * @returns {boolean} True se la stringa ha un formato email valido, false altrimenti.
 */
const isValidEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
};

/** 
 * Creazione e configurazione del router per la route /password-reset.
 * @param {object} sql - Istanza client del database (e.g. neon).
 * @returns {object} Configurazione del router Express.
 */
const passwordResetController = (sql) => {

    // POST /password-reset/request - Richiesta reset password (invio email)
    router.post("/request", async (req, res) => {
        console.log("[PASSWORD-RESET] Request received for email:", req.body.email);
        const { email } = req.body;

        if (!email || !isValidEmail(email)) {
            return res.status(400).json({ error: "Valid email is required" });
        }

        try {
            // 1. Verifica che l'utente esista
            const users = await sql`SELECT id, username, email FROM utenti WHERE email = ${email}`;

            if (users.length === 0) {
                console.log("[PASSWORD-RESET] Email not found (returning generic message):", email);
                // Per sicurezza, restituisci sempre lo stesso messaggio
                return res.status(200).json({
                    message: "If the email exists, a reset link has been sent"
                });
            }

            const user = users[0];

            // 2. Genera un token sicuro (32 byte = 64 caratteri hex)
            const resetToken = crypto.randomBytes(32).toString("hex");

            // 3. Hash del token prima di salvarlo nel DB (mai salvare token in chiaro)
            const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

            // 4. Imposta scadenza (1 ora)
            const expiry = new Date(Date.now() + 3600000); // 1 ora

            // 5. Salva nel database
            await sql`
                UPDATE utenti 
                SET reset_token = ${hashedToken}, reset_token_expiry = ${expiry}
                WHERE id = ${user.id}
            `;

            console.log("[PASSWORD-RESET] Token generated for user ID:", user.id);

            // 6. Costruisci il link di reset (usa il token NON hashato)
            const resetLink = `${FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

            // 7. Invia l'email
            await transporter.sendMail({
                from: '"PWSCAM Support" <pwscamits-2526@libero.it>',
                to: email,
                subject: "Password Reset Request",
                text: `Hello,\n\nYou requested a password reset. Click the link below to reset your password:\n\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2>Password Reset Request</h2>
                        <p>Hello,</p>
                        <p>You requested a password reset for your MASTERMIND PWSCAM account.</p>
                        <p>Click the button below to reset your password:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetLink}" 
                               style="background-color: #4CAF50; color: white; padding: 14px 28px; 
                                      text-decoration: none; border-radius: 4px; display: inline-block;">
                                Reset Password
                            </a>
                        </div>
                        <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
                        <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
                        <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
                        <p style="color: #999; font-size: 12px;">PWSCAM Team</p>
                    </div>
                `
            });

            console.log("[PASSWORD-RESET] Reset email sent successfully to:", email);
            return res.status(200).json({
                message: "If the email exists, a reset link has been sent"
            });

        } catch (err) {
            console.error("[PASSWORD-RESET] Error during request:", err);
            return res.status(500).json({ error: "Internal server error" });
        }
    });

    // POST /password-reset/confirm - Conferma reset con il token
    router.post("/confirm", async (req, res) => {
        console.log("[PASSWORD-RESET] Confirmation attempt for email:", req.body.email);
        const { email, token, newPassword } = req.body;

        if (!email || !token || !newPassword) {
            return res.status(400).json({ error: "Email, token and new password are required" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters" });
        }

        try {
            // 1. Hash del token ricevuto per confrontarlo con quello nel DB
            const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

            // 2. Cerca l'utente con token valido e non scaduto
            const users = await sql`
                SELECT id, username, reset_token, reset_token_expiry 
                FROM utenti 
                WHERE email = ${email}
                  AND reset_token = ${hashedToken}
                  AND reset_token_expiry > NOW()
            `;

            if (users.length === 0) {
                console.log("[PASSWORD-RESET] Invalid or expired token for:", email);
                return res.status(400).json({
                    error: "Invalid or expired reset token"
                });
            }

            const user = users[0];

            // 3. Hash della nuova password
            const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

            // 4. Aggiorna la password e rimuovi il token
            await sql`
                UPDATE utenti 
                SET pwd = ${hashedPassword}, 
                    reset_token = NULL, 
                    reset_token_expiry = NULL
                WHERE id = ${user.id}
            `;

            console.log("[PASSWORD-RESET] Password reset successfully for user ID:", user.id);
            return res.status(200).json({
                message: "Password reset successfully"
            });

        } catch (err) {
            console.error("[PASSWORD-RESET] Error during confirmation:", err);
            return res.status(500).json({ error: "Internal server error" });
        }
    });

    return router;
};

module.exports = passwordResetController;
