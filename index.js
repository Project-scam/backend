require("dotenv").config();
const express = require("express");
const { neon } = require("@neondatabase/serverless");

const app = express();
const sql = neon(process.env.DATABASE_URL); // Usa la tua DATABASE_URL

app.get("/", async (req, res) => {
  try {
    const result = await sql`SELECT version()`;
    res.json({ version: result[0].version });
  } catch (error) {
    res.status(500).json({ error: "Errore database" });
  }
});

// Leggere tutti gli utenti
app.get("/utenti", async (req, res) => {
  try {
    const utenti = await sql`SELECT * FROM utenti`; // nome tabella esatto
    res.json(utenti);
    console.log(utenti);
  } catch (err) {
    console.error("Errore query utenti:", err);
    res.status(500).json({ error: "Errore nel leggere la tabella utenti" });
  }
});

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log("Server su http://localhost:3000");
  });
}
module.exports = app;
