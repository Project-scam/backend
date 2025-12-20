const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();

const SALT_ROUNDS = 10; // Numero di cicli per l'hashing. 10 è un buon punto di partenza.

/**
 * Crea e configura il router per la rotta di registrazione.
 * @param {object} sql - L'istanza del client per il database (es. neon).
 * @returns {object} Il router di Express configurato.
 */
const registrationController = (sql) => {
    router.post("/", async (req, res) => {
        const { username, password } = req.body || {};

        if (!username || !password) {
            return res
                .status(400)
                .json({ error: "Username e password sono obbligatorie" });
        }

        try {
            // 1. Controlla se l'utente esiste già
            const existingUser =
                await sql`SELECT id FROM utenti WHERE username = ${username}`;

            if (existingUser.length > 0) {
                return res.status(409).json({ error: "Username già in uso" });
            }

            // 2. Esegui l'hashing della password
            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

            // 3. Inserisci il nuovo utente nel database
            const result =
                await sql`INSERT INTO utenti (username, pwd) VALUES (${username}, ${hashedPassword}) RETURNING id, username`;

            // 4. Restituisci una risposta di successo
            return res.status(201).json({
                message: "Utente registrato con successo",
                user: result[0],
            });
        } catch (err) {
            console.error("Errore durante la registrazione:", err);
            return res.status(500).json({ error: "Errore interno del server" });
        }
    });

    return router;
};

module.exports = registrationController;