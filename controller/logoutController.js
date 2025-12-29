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
        const token = req.cookies.token; // Recupera il token dal cookie

        if (!token) {
            return res.status(200).json({ message: "Logout effettuato (nessun token trovato)" });
        }

        try {
            // Verifica il token usando lo stesso segreto del login
            jwt.verify(token, process.env.JWT_SECRET || "segreto_super_sicuro_da_cambiare", async (err, user) => {
                if (err) {
                    // Se il token è scaduto, l'utente è comunque "fuori", quindi rispondiamo OK
                    res.clearCookie("token"); // Pulisce comunque il cookie
                    return res.status(200).json({ message: "Logout effettuato (token scaduto)" });
                }

                // Aggiorna lo stato nel DB a 'U' (Unlogged)
                await sql`UPDATE utenti SET stato = 'U' WHERE id = ${user.id}`;

                // Cancella il cookie HttpOnly
                res.clearCookie("token", {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "strict"
                });

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
