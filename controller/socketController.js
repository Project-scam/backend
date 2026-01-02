//==============================================================
// File: socketController.js
// Gestione eventi WebSocket per lobby e sfide
//==============================================================

/**
 * Gestisce tutta la logica WebSocket per la lista  e il gioco.
 * Mantiene in memoria la lista degli utenti connessi.
 *
 * @param {object} io - L'istanza del server Socket.io
 */
const socketController = (io) => {
  // Mappa per tracciare gli utenti online: socket.id -> { username, ... }
  const onlineUsers = new Map();

  io.on("connection", (socket) => {
    console.log(`[SOCKET] Nuova connessione: ${socket.id}`);

    // 1. Registrazione utente nella lista
    // Quando il frontend si connette e invia "register_user"
    socket.on("register_user", (userData) => {
      // Gestisce sia se userData è una stringa (da App.jsx attuale) sia se è un oggetto
      const username =
        typeof userData === "string" ? userData : userData?.username;

      // Salviamo anche il socketId per poterlo contattare privatamente
      const user = {
        username: username,
        socketId: socket.id,
        status: "online",
      };

      onlineUsers.set(socket.id, user);
      const usersList = Array.from(onlineUsers.values());
      console.log(
        `[SOCKET] Utente registrato: ${username} (${socket.id}), totale utenti online: ${usersList.length}`
      );
      console.log(
        "[SOCKET] Lista utenti:",
        usersList.map((u) => ({ username: u.username, socketId: u.socketId }))
      );

      // Notifica a TUTTI i client la nuova lista utenti aggiornata
      io.emit("users_list_update", usersList);
    });

    // 2. Richiesta lista utenti (per chi entra dopo o ricarica la pagina)
    socket.on("get_users", () => {
      const usersList = Array.from(onlineUsers.values());
      console.log(
        `[SOCKET] Richiesta lista utenti da ${socket.id}, invio ${usersList.length} utenti`
      );
      socket.emit("users_list_update", usersList);
    });

    // 3. Gestione Sfida: Invio
    socket.on("send_challenge", ({ targetSocketId }) => {
      const challenger = onlineUsers.get(socket.id);

      if (challenger && onlineUsers.has(targetSocketId)) {
        // Invia l'evento SOLO all'utente sfidato
        io.to(targetSocketId).emit("challenge_received", {
          username: challenger.username,
          socketId: socket.id,
        });
      }
    });

    // 4. Gestione Sfida: Accettazione
    socket.on("accept_challenge", ({ challengerId }) => {
      const accepter = onlineUsers.get(socket.id);
      const challenger = onlineUsers.get(challengerId);

      if (accepter && challenger) {
        // Notifica lo sfidante che la sfida è stata accettata
        io.to(challengerId).emit("challenge_accepted", {
          opponent: accepter.username,
          opponentSocketId: socket.id,
        });

        // Notifica anche chi ha accettato (l'accepter)
        io.to(socket.id).emit("challenge_accepted", {
          opponent: challenger.username,
          opponentSocketId: challengerId,
        });
      }
    });

    // 5. Disconnessione
    socket.on("disconnect", () => {
      if (onlineUsers.has(socket.id)) {
        onlineUsers.delete(socket.id);

        // Aggiorna la lista per tutti gli altri
        io.emit("users_list_update", Array.from(onlineUsers.values()));
      }
    });

    // 6. Gestione Codice Segreto in 1vs1: Maker invia codice al Breaker
    socket.on("send_secret_code", ({ targetSocketId, secretCode }) => {
      // ✅ Validazione parametri
      if (!targetSocketId || !secretCode || !Array.isArray(secretCode)) {
        console.error("[SOCKET] Parametri invalidi per send_secret_code");
        return;
      }

      const sender = onlineUsers.get(socket.id);
      if (sender && onlineUsers.has(targetSocketId)) {
        // Invia il codice segreto SOLO al breaker
        io.to(targetSocketId).emit("secret_code_received", {
          secretCode: secretCode,
          maker: sender.username,
        });
        console.log(
          `[SOCKET] Codice segreto inviato da ${sender.username} a ${targetSocketId}`
        );
      }
    });

    // 7. Gestione Tentativo in 1vs1: Breaker invia tentativo al Maker per feedback
    socket.on("send_guess", ({ targetSocketId, guess, feedback }) => {
      // ✅ Validazione parametri
      if (!targetSocketId || !guess || !Array.isArray(guess) || !feedback) {
        console.error("[SOCKET] Parametri invalidi per send_guess");
        return;
      }

      const sender = onlineUsers.get(socket.id);
      if (sender && onlineUsers.has(targetSocketId)) {
        // Invia il tentativo e feedback al maker (per visualizzazione)
        io.to(targetSocketId).emit("guess_received", {
          guess: guess,
          feedback: feedback,
          breaker: sender.username,
        });
      }
    });

    // 8. Gestione Fine Partita: Notifica entrambi i giocatori
    socket.on(
      "game_ended",
      ({ targetSocketId, gameWon, guessesCount, winner }) => {
        // ✅ Validazione parametri
        if (
          !targetSocketId ||
          gameWon === undefined ||
          guessesCount === undefined
        ) {
          console.error("[SOCKET] Parametri invalidi per game_ended");
          return;
        }

        const sender = onlineUsers.get(socket.id);
        if (sender && onlineUsers.has(targetSocketId)) {
          const opponent = onlineUsers.get(targetSocketId);
          // Notifica entrambi i giocatori della fine partita
          io.to(targetSocketId).emit("game_ended_notification", {
            gameWon: gameWon,
            guessesCount: guessesCount,
            winner: winner,
            opponent: sender.username,
          });
          socket.emit("game_ended_notification", {
            gameWon: gameWon,
            guessesCount: guessesCount,
            winner: winner,
            opponent: opponent?.username,
          });
        }
      }
    );
  });
};

module.exports = socketController;
