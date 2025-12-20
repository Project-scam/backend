const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");

/**
 * Crea e configura il router per la rotta di login.
 * @param {object} sql - L'istanza del client per il database (es. neon).
 * @returns {object} Il router di Express configurato.
 */
const loginController = (sql) => {
    // Login utente
    // La rotta è POST / dato che il prefisso /login verrà usato in index.js
    router.post("/", async (req, res) => {
        const { username, password } = req.body || {};

        if (!username || !password) {
            return res
                .status(400)
                .json({ error: "Username e password sono obbligatorie" });
        }

        try {
            // Cerca l'utente per username
            const result =
                await sql`SELECT id, username, pwd FROM utenti WHERE username = ${username}`;

            if (result.length === 0) {
                // Messaggio generico per non rivelare se l'utente esiste o meno
                return res.status(401).json({ error: "Credenziali non valide" });
            }

            const utente = result[0];

            // Confronta la password fornita con l'hash salvato nel DB
            const passwordMatch = await bcrypt.compare(password, utente.pwd);
            if (!passwordMatch) {
                return res.status(401).json({ error: "Credenziali non valide" });
            }

            // Login successo: restituisce un messaggio e i dati utente (senza password)
            return res.json({
                message: "Login effettuato con successo",
                user: {
                    id: utente.id,
                    username: utente.username,
                },
            });
        } catch (err) {
            console.error("Errore durante il login:", err);
            return res.status(500).json({ error: "Errore interno del server" });
        }
    });

    return router;
};

module.exports = loginController;