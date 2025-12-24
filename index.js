require("dotenv").config();
const express = require("express");
const http = require("http"); // Modulo nativo di Node.js per creare server http di basso livello necessario per Socket.io
const { Server } = require("socket.io");
const { neon } = require("@neondatabase/serverless");
const cors = require('cors');
const loginController = require('./controller/loginController');
const logoutController = require('./controller/logoutController');
const registrationController = require('./controller/registrationController');
const userController = require('./controller/userController');
const socketController = require("./controller/socketController");


const app = express();

// 1. Creiamo esplicitamente il server HTTP wrappando l'app Express
const server = http.createServer(app);

// 2. Configuriamo Socket.io attanccandolo al server HTTP
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
// Controllo di sicurezza all'avvio
if (!process.env.DATABASE_URL) {
    console.error("❌ ERRORE FATALE: La variabile DATABASE_URL non è definita nel file .env!");
    process.exit(1);
}
const sql = neon(process.env.DATABASE_URL); // Usa la tua DATABASE_URL

// Passiamo l'istanza "io" al controller dei socket
socketController(io);

//Abilita CORS per tutte le rotte 
app.use(cors());
app.use(express.json());

// Usa il router per la rotta di login
const loginRouter = loginController(sql);
app.use("/login", loginRouter);

// Usa il router per la rotta di logour
const logoutRouter = logoutController(sql);
app.use("/logout", logoutRouter);

// Usa il router per la rotta di registrazione
const registrationRouter = registrationController(sql);
app.use("/register", registrationRouter);

// Usa il router per le rotte degli utenti
const utentiRouter = userController(sql);
app.use("/utenti", utentiRouter);

/*if (process.env.NODE_ENV !== "production") {
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log("Server su http://localhost:3000");
    });
}*/
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = server;
