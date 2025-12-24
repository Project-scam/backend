//=============================
// File: logoutController.js
// script che esegue il logout
//=============================

const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const logoutController = (sql) => {
    // Rotta POST / (che sarà montata su /logout)
    router.post("/", async (req, res) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(200).json({ message: "Logout effettuato (nessun token)" });
        }

        try {
            // Verifica il token usando lo stesso segreto del login
            jwt.verify(token, process.env.JWT_SECRET || "segreto_super_sicuro_da_cambiare", async (err, user) => {
                if (err) {
                    // Se il token è scaduto, l'utente è comunque "fuori", quindi rispondiamo OK
                    return res.status(200).json({ message: "Logout effettuato (token scaduto)" });
                }

                // Aggiorna lo stato nel DB a 'U' (Unlogged)
                await sql`UPDATE utenti SET stato = 'U' WHERE id = ${user.id}`;

                return res.json({ message: "Logout effettuato con successo" });
            });
        } catch (error) {
            console.error("Errore logout:", error);
            return res.status(500).json({ error: "Errore interno del server" });
        }
    });

    return router;
};

module.exports = logoutController;
