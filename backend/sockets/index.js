/*// backend/sockets/index.js - MODIFIE juste cette partie
const { Server } = require("socket.io");
const { socketAuth } = require("../middlewares/authMiddleware");
const quizSocketHandler = require("./quizSocket");
const chatSocketHandler = require("./chatSocket");
const friendSocketHandler = require("./friendSocket");

function initSockets(server) {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  // Middleware d'authentification Socket
  io.use(socketAuth);
  io.use((socket, next) => {
    const userId = socket.handshake.auth?.userId;

    if (!userId) {
      return next(new Error("Unauthorized socket"));
    }

    socket.userId = userId;
    next();
  });
  const onlineUsers = new Map(); // userId => socketId
  io.on("connection", (socket) => {
    const userId = socket.userId;

    quizSocketHandler(io, socket);
    chatSocketHandler(io, socket);
    friendSocketHandler(io, socket);

    onlineUsers.set(userId, socket.id);
    io.emit("user_online", userId);

    socket.on("get_online_users", () => {
      socket.emit("online_users", [...onlineUsers.keys()]);
    });

    socket.on("disconnect", () => {
      onlineUsers.delete(userId);
      io.emit("user_offline", userId);
    });
  });

  // Exposer io globalement pour les controllers
  global.io = io;

  return io;
}

module.exports = { initSockets };*/
