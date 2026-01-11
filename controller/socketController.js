//==============================================================
// File: socketController.js
// WebSocket event handling for lobby and challenges
//==============================================================

/**
 * Handles all WebSocket logic for the list and the game.
 * Maintains in memory the list of connected users.
 *
 * @param {object} io - The Socket.io server instance
 * @param {function} sql - The database client instance (neon)
 */
const socketController = (io, sql) => {
  // Map to track online users: socket.id -> { username, ... }
  const onlineUsers = new Map();

  // On server startup, reset all users to 'U' (Unlogged) state
  // This handles the case where the server restarts but DB still has users as 'L'
  (async () => {
    try {
      await sql`UPDATE utenti SET stato = 'U' WHERE stato = 'L'`;
      console.log("[SOCKET] Reset all users to 'U' state on server startup");
    } catch (err) {
      console.error("[SOCKET] Error resetting user states:", err);
    }
  })();

  io.on("connection", (socket) => {
    console.log(`[SOCKET] New connection: ${socket.id}`);

    // 1. User registration in the list
    socket.on("register_user", async (userData) => {
      // Handles both if userData is a string and if it's an object
      const username =
        typeof userData === "string" ? userData : userData?.username;

      // Skip registration for Guest users
      if (!username || username === "Guest") {
        console.log("[SOCKET] Guest or invalid user skipped");
        return;
      }

      // Remove any existing entry for this username (handles reconnections)
      for (const [socketId, user] of onlineUsers.entries()) {
        if (user.username === username) {
          onlineUsers.delete(socketId);
          console.log(`[SOCKET] Removed old socket for user: ${username}`);
        }
      }

      // Save the user with their socketId
      const user = {
        username: username,
        socketId: socket.id,
        status: "online",
      };

      onlineUsers.set(socket.id, user);

      // Update DB status to 'L' (Logged)
      try {
        await sql`UPDATE utenti SET stato = 'L' WHERE username = ${username}`;
      } catch (err) {
        console.error("[SOCKET] Error updating user state in DB:", err);
      }

      const usersList = Array.from(onlineUsers.values());
      console.log(
        `[SOCKET] User registered: ${username} (${socket.id}), total online users: ${usersList.length}`
      );

      // Notify ALL clients of the updated user list
      io.emit("users_list_update", usersList);
    });

    // 2. User list request
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
        io.to(challengerId).emit("challenge_accepted", {
          opponent: accepter.username,
          opponentSocketId: socket.id,
        });

        io.to(socket.id).emit("challenge_accepted", {
          opponent: challenger.username,
          opponentSocketId: challengerId,
        });
      }
    });

    // 5. Disconnection - Update both Map and DB
    socket.on("disconnect", async () => {
      const user = onlineUsers.get(socket.id);
      if (user) {
        onlineUsers.delete(socket.id);

        // Update DB status to 'U' (Unlogged)
        try {
          await sql`UPDATE utenti SET stato = 'U' WHERE username = ${user.username}`;
          console.log(`[SOCKET] User ${user.username} disconnected and DB updated`);
        } catch (err) {
          console.error("[SOCKET] Error updating user state on disconnect:", err);
        }

        // Update the list for everyone else
        io.emit("users_list_update", Array.from(onlineUsers.values()));
      }
    });

    // 6. Secret Code Handling in 1vs1
    socket.on("send_secret_code", ({ targetSocketId, secretCode }) => {
      if (!targetSocketId || !secretCode || !Array.isArray(secretCode)) {
        console.error("[SOCKET] Invalid parameters for send_secret_code");
        return;
      }

      const sender = onlineUsers.get(socket.id);
      if (sender && onlineUsers.has(targetSocketId)) {
        io.to(targetSocketId).emit("secret_code_received", {
          secretCode: secretCode,
          maker: sender.username,
        });
        console.log(
          `[SOCKET] Secret code sent from ${sender.username} to ${targetSocketId}`
        );
      }
    });

    // 7. Guess Handling in 1vs1
    socket.on("send_guess", ({ targetSocketId, guess, feedback }) => {
      if (!targetSocketId || !guess || !Array.isArray(guess) || !feedback) {
        console.error("[SOCKET] Invalid parameters for send_guess");
        return;
      }

      const sender = onlineUsers.get(socket.id);
      if (sender && onlineUsers.has(targetSocketId)) {
        io.to(targetSocketId).emit("guess_received", {
          guess: guess,
          feedback: feedback,
          breaker: sender.username,
        });
      }
    });

    // 8. Game End Handling
    socket.on(
      "game_ended",
      ({ targetSocketId, gameWon, guessesCount, winner }) => {
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
