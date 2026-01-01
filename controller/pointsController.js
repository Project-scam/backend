//=======================================
// File: pointsController.js
// Controller per gestire l'aggiornamento dei punti
//=======================================

const express = require("express");
const router = express.Router();

/**
 * Crea e configura il router per le rotte relative ai punti.
 * @param {object} sql - L'istanza del client per il database.
 * @returns {object} Il router di Express configurato.
 */
const pointsController = (sql) => {
  // POST /points/update
  // Aggiorna i punti di un utente
  router.post("/update", async (req, res) => {
    try {
      const { username, pointsToAdd } = req.body;

      if (!username || pointsToAdd === undefined) {
        return res.status(400).json({
          error: "Username e pointsToAdd sono obbligatori",
        });
      }

      // ✅ SICUREZZA: Verifica che l'utente autenticato possa aggiornare solo i propri punti
      // (oppure è un admin - da implementare se necessario)
      const authenticatedUsername = req.user?.username;
      if (authenticatedUsername !== username) {
        return res.status(403).json({
          error: "Non autorizzato: puoi aggiornare solo i tuoi punti",
        });
      }

      // Verifica che l'utente esista
      const user = await sql`
                SELECT id, username, punti 
                FROM utenti 
                WHERE username = ${username}
            `;

      if (user.length === 0) {
        return res.status(404).json({ error: "Utente non trovato" });
      }

      // Calcola i nuovi punti (assicurandosi che non vadano sotto zero)
      const currentPoints = user[0].punti || 0;
      const newPoints = Math.max(0, currentPoints + pointsToAdd);

      // Aggiorna i punti nel database
      await sql`
                UPDATE utenti 
                SET punti = ${newPoints} 
                WHERE username = ${username}
            `;

      console.log(
        `[POINTS] ${username}: ${currentPoints} + ${pointsToAdd} = ${newPoints}`
      );

      res.json({
        success: true,
        username: username,
        previousPoints: currentPoints,
        pointsAdded: pointsToAdd,
        newPoints: newPoints,
      });
    } catch (err) {
      console.error("[POINTS] Errore aggiornamento punti:", err);
      return res.status(500).json({ error: "Errore interno del server" });
    }
  });

  // GET /points/:username
  // Ottiene i punti attuali di un utente
  router.get("/:username", async (req, res) => {
    try {
      const { username } = req.params;

      const user = await sql`
                SELECT username, punti 
                FROM utenti 
                WHERE username = ${username}
            `;

      if (user.length === 0) {
        return res.status(404).json({ error: "Utente non trovato" });
      }

      res.json({
        username: user[0].username,
        punti: user[0].punti || 0,
      });
    } catch (err) {
      console.error("[POINTS] Errore lettura punti:", err);
      return res.status(500).json({ error: "Errore interno del server" });
    }
  });

  return router;
};

module.exports = pointsController;
