require("dotenv").config();
const express = require("express");
const { neon } = require("@neondatabase/serverless");

const app = express();
const sql = neon(process.env.DATABASE_URL); // Usa la tua DATABASE_URL

// Middleware per leggere JSON nel body delle richieste
app.use(express.json());

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

// Login utente
// Esempio: POST /login  { "useranme": "Mario123", "password": "password123" }
app.post("/login", async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username e password sono obbligatorie" });
  }

  try {
    // Cerca l'utente per email
    const result =
      await sql`SELECT id, username, pwd FROM utenti WHERE username = ${username}`;

    if (result.length === 0) {
      return res.status(401).json({ error: "Credenziali non valide" });
    }

    const utente = result[0];

    // ATTENZIONE:
    // - Qui viene fatto un confronto in chiaro.
    // - Se in DB hai password hashate (consigliato), sostituisci questo controllo
    //   con un confronto usando bcrypt (es. bcrypt.compare(password, utente.password)).
    if (utente.pwd !== password) {
      return res.status(401).json({ error: "Credenziali non valide" });
    }

    // In una app reale qui genereresti un token (JWT) o imposteresti una sessione/cookie.
    // Per ora restituiamo solo alcuni dati di base dell'utente.
    return res.json({
      message: "Login effettuato con successo",
      user: {
        id: utente.id,
        username: utente.username,
      },
    });
  } catch (err) {
    console.error("Errore durante il login:", err);
    return res.status(500).json({ error: "Errore durante il login" });
  }
});

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log("Server su http://localhost:3000");
  });
}
module.exports = app;
