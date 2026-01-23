require("dotenv").config();
const express = require("express");
const http = require("http"); // Native Node.js module to create low-level http server necessary for Socket.io
const { Server } = require("socket.io");
const { neon } = require("@neondatabase/serverless");
const cors = require("cors");
const loginController = require("./controller/loginController");
const logoutController = require("./controller/logoutController");
const registrationController = require("./controller/registrationController");
const userController = require("./controller/userController");
const rankingController = require("./controller/rankingController");
const pointsController = require("./controller/pointsController");
const passwordResetController = require("./controller/passwordResetController");
const socketController = require("./controller/socketController");
const authMiddleware = require("./middleware/authMiddleware");
const cookieParser = require("cookie-parser");
const { FRONTEND_URL } = require("./config");

const app = express();
app.set("trust proxy", 1); // ESSENTIAL for Secure/SameSite:None cookies on Render/Vercel

// 1. Explicitly create the HTTP server wrapping the Express app
const server = http.createServer(app);

// 2. Configure Socket.io attaching it to the HTTP server
const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL, // Use the correct URL (localhost or production)
    methods: ["GET", "POST"],
    credentials: true, // Allows, if necessary, cookie passing also in socket handshake
  },
});
// Security check on startup
if (!process.env.DATABASE_URL) {
  console.error(
    "❌ FATAL ERROR: DATABASE_URL variable is not defined in the .env file!"
  );
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL); // Use your DATABASE_URL

// Pass the "io" instance to the socket controller
socketController(io, sql);

//Enable CORS for all routes

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // Postman / server-to-server

      if (
        origin === "https://pwscam.vercel.app" ||
        origin === "http://localhost:5173"
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(cookieParser()); // Enable reading of req.cookies

// Use the router for the login route
const loginRouter = loginController(sql);
app.use("/login", loginRouter);

// Use the router for the logout route
const logoutRouter = logoutController(sql);
app.use("/logout", logoutRouter);

// Use the router for the registration route
const registrationRouter = registrationController(sql);
app.use("/register", registrationRouter);

// Use the router for user routes
const utentiRouter = userController(sql);
app.use("/utenti", authMiddleware, utentiRouter); // The route is now protected by middleware

// Use the router for the ranking
const rankingRouter = rankingController(sql);
app.use("/ranking", rankingRouter); // tolto authMiddleware perchè la classifica è pubblica e su determinati dispositivi non ne permette la visualizzazione

// Use the router for points
const pointsRouter = pointsController(sql);
app.use("/points", authMiddleware, pointsRouter);

// Use the router for password reset
const passwordResetRouter = passwordResetController(sql);
app.use("/password-reset", passwordResetRouter);

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
