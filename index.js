require("dotenv").config();
const express = require("express");
const { neon } = require("@neondatabase/serverless");
const cors = require('cors');
const loginController = require('./controller/loginController');
const registrationController = require('./controller/registrationController');
const userController = require('./controller/utenticontroller');

const app = express();
const sql = neon(process.env.DATABASE_URL); // Usa la tua DATABASE_URL

//Abilita CORS per tutte le rotte 
app.use(cors());
app.use(express.json());

// Usa il router per la rotta di login
const loginRouter = loginController(sql);
app.use("/login", loginRouter);

// Usa il router per la rotta di registrazione
const registrationRouter = registrationController(sql);
app.use("/register", registrationRouter);

// Usa il router per le rotte degli utenti
const utentiRouter = userController(sql);
app.use("/utenti", utentiRouter);

if (process.env.NODE_ENV !== "production") {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log("Server su http://localhost:3000");
    });
}
module.exports = app;
