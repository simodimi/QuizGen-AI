const { Server } = require("socket.io");
const { socketAuth } = require("../middlewares/authMiddleware");

const quizSocketHandler = require("./quizSocket");
const chatSocketHandler = require("./chatSocket");
const presenceSocketHandler = require("./presenceSocket");

function initSockets(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
      credentials: true,
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
    },
  });

  // Middleware d'authentification Socket
  io.use(socketAuth);

  io.on("connection", (socket) => {
    console.log(
      `👤 Nouvelle connexion Socket: ${socket.id} (user: ${socket.userId})`,
    );

    // Rejoindre la room de l'utilisateur
    socket.join(`user_${socket.userId}`);

    // Initialiser les handlers
    presenceSocketHandler(io, socket);
    quizSocketHandler(io, socket);
    chatSocketHandler(io, socket);

    // Déconnexion
    socket.on("disconnect", (reason) => {
      console.log(`Socket déconnecté: ${socket.id} - Raison: ${reason}`);
    });
  });

  // Exposer io globalement pour les controllers
  global.io = io;

  return io;
}

module.exports = { initSockets };
