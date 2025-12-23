//==============================================================
// File: socketController.js
// Gestione eventi WebSocket per lobby e sfide
//==============================================================

/**
 * Gestisce tutta la logica WebSocket per la lobby e il gioco.
 * Mantiene in memoria la lista degli utenti connessi.
 * 
 * @param {object} io - L'istanza del server Socket.io
 */
const socketController = (io) => {
    // Mappa per tracciare gli utenti online: socket.id -> { username, ... }
    const onlineUsers = new Map();

    io.on("connection", (socket) => {
        console.log(`[SOCKET] Nuova connessione: ${socket.id}`);

        // 1. Registrazione utente nella lobby
        // Quando il frontend si connette e invia "register_user"
        socket.on("register_user", (userData) => {
            // userData dovrebbe contenere { username: "Mario" }
            // Salviamo anche il socketId per poterlo contattare privatamente
            const user = {
                ...userData,
                socketId: socket.id,
                status: "online"
            };

            onlineUsers.set(socket.id, user);

            // Notifica a TUTTI i client la nuova lista utenti aggiornata
            io.emit("user_list_update", Array.from(onlineUsers.values()));
        });

        // 2. Richiesta lista utenti (per chi entra dopo o ricarica la pagina)
        socket.on("get_users", () => {
            socket.emit("user_list_update", Array.from(onlineUsers.values()));
        });

        // 3. Gestione Sfida: Invio
        socket.on("send_challenge", ({ targetSocketId }) => {
            const challenger = onlineUsers.get(socket.id);

            if (challenger && onlineUsers.has(targetSocketId)) {
                // Invia l'evento SOLO all'utente sfidato
                io.to(targetSocketId).emit("challenge_received", {
                    username: challenger.username,
                    socketId: socket.id
                });
            }
        });

        // 4. Gestione Sfida: Accettazione
        socket.on("accept_challenge", ({ challengerId }) => {
            const accepter = onlineUsers.get(socket.id);

            if (accepter) {
                // Notifica lo sfidante che la sfida è stata accettata
                io.to(challengerId).emit("challenge_accepted", {
                    opponent: accepter.username,
                    opponentSocketId: socket.id
                });
            }
        });

        // 5. Disconnessione
        socket.on("disconnect", () => {
            if (onlineUsers.has(socket.id)) {
                onlineUsers.delete(socket.id);

                // Aggiorna la lista per tutti gli altri
                io.emit("user_list_update", Array.from(onlineUsers.values()));
            }
        });
    });
};

module.exports = socketController;