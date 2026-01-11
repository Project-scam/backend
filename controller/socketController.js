//==============================================================
// File: socketController.js
// WebSocket event handling for lobby and challenges
//==============================================================

/**
 * Handles all WebSocket logic for the list and the game.
 * Maintains in memory the list of connected users.
 *
 * @param {object} io - The Socket.io server instance
 */
const socketController = (io) => {
  // Map to track online users: socket.id -> { username, ... }
  const onlineUsers = new Map();

  io.on("connection", (socket) => {
    console.log(`[SOCKET] New connection: ${socket.id}`);

    // 1. User registration in the list
    // When the frontend connects and sends "register_user"
    socket.on("register_user", (userData) => {
      // Handles both if userData is a string (from current App.jsx) and if it's an object
      if(userData.user === "Guest") {
        console.log()
        return null
      } 
      const username =
        typeof userData === "string" ? userData : userData?.username;

      // Also save the socketId to contact them privately
      const user = {
        username: username,
        socketId: socket.id,
        status: "online",
      };

      onlineUsers.set(socket.id, user);
      const usersList = Array.from(onlineUsers.values());
      console.log(
        `[SOCKET] User registered: ${username} (${socket.id}), total online users: ${usersList.length}`
      );
      console.log(
        "[SOCKET] User list:",
        usersList.map((u) => ({ username: u.username, socketId: u.socketId }))
      );

      // Notify ALL clients of the updated user list
      io.emit("users_list_update", usersList);
    });

    // 2. User list request (for those who enter later or reload the page)
    socket.on("get_users", () => {
      const usersList = Array.from(onlineUsers.values());
      console.log(
        `[SOCKET] User list request from ${socket.id}, sending ${usersList.length} users`
      );
      socket.emit("users_list_update", usersList);
    });

    // 3. Challenge Handling: Send
    socket.on("send_challenge", ({ targetSocketId }) => {
      const challenger = onlineUsers.get(socket.id);

      if (challenger && onlineUsers.has(targetSocketId)) {
        // Send the event ONLY to the challenged user
        io.to(targetSocketId).emit("challenge_received", {
          username: challenger.username,
          socketId: socket.id,
        });
      }
    });

    // 4. Challenge Handling: Acceptance
    socket.on("accept_challenge", ({ challengerId }) => {
      const accepter = onlineUsers.get(socket.id);
      const challenger = onlineUsers.get(challengerId);

      if (accepter && challenger) {
        // Notify the challenger that the challenge has been accepted
        io.to(challengerId).emit("challenge_accepted", {
          opponent: accepter.username,
          opponentSocketId: socket.id,
        });

        // Also notify the accepter
        io.to(socket.id).emit("challenge_accepted", {
          opponent: challenger.username,
          opponentSocketId: challengerId,
        });
      }
    });

    // 5. Disconnection
    socket.on("disconnect", () => {
      if (onlineUsers.has(socket.id)) {
        onlineUsers.delete(socket.id);

        // Update the list for everyone else
        io.emit("users_list_update", Array.from(onlineUsers.values()));
      }
    });

    // 6. Secret Code Handling in 1vs1: Maker sends code to Breaker
    socket.on("send_secret_code", ({ targetSocketId, secretCode }) => {
      // ✅ Parameter validation
      if (!targetSocketId || !secretCode || !Array.isArray(secretCode)) {
        console.error("[SOCKET] Invalid parameters for send_secret_code");
        return;
      }

      const sender = onlineUsers.get(socket.id);
      if (sender && onlineUsers.has(targetSocketId)) {
        // Send the secret code ONLY to the breaker
        io.to(targetSocketId).emit("secret_code_received", {
          secretCode: secretCode,
          maker: sender.username,
        });
        console.log(
          `[SOCKET] Secret code sent from ${sender.username} to ${targetSocketId}`
        );
      }
    });

    // 7. Guess Handling in 1vs1: Breaker sends guess to Maker for feedback
    socket.on("send_guess", ({ targetSocketId, guess, feedback }) => {
      // ✅ Parameter validation
      if (!targetSocketId || !guess || !Array.isArray(guess) || !feedback) {
        console.error("[SOCKET] Invalid parameters for send_guess");
        return;
      }

      const sender = onlineUsers.get(socket.id);
      if (sender && onlineUsers.has(targetSocketId)) {
        // Send the guess and feedback to the maker (for display)
        io.to(targetSocketId).emit("guess_received", {
          guess: guess,
          feedback: feedback,
          breaker: sender.username,
        });
      }
    });

    // 8. Game End Handling: Notify both players
    socket.on(
      "game_ended",
      ({ targetSocketId, gameWon, guessesCount, winner }) => {
        // ✅ Parameter validation
        if (
          !targetSocketId ||
          gameWon === undefined ||
          guessesCount === undefined
        ) {
          console.error("[SOCKET] Invalid parameters for game_ended");
          return;
        }

        const sender = onlineUsers.get(socket.id);
        if (sender && onlineUsers.has(targetSocketId)) {
          const opponent = onlineUsers.get(targetSocketId);
          // Notify both players of the game end
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
