const express = require("express");
const cors = require("cors");
require("dotenv").config();
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const http = require("http");
const path = require("path");
const compression = require("compression");
const { sequelize } = require("../backend/models/Association");
const app = express();
const server = http.createServer(app);
const { apiLimiter } = require("./middlewares/ratelimit");
const { Server } = require("socket.io");
const User = require("./models/User");
const ollamaService = require("../backend/config/ollama");
// Configuration CORS
const CLIENT_ORIGIN = "http://localhost:5173";
const corsOptions = {
  origin: CLIENT_ORIGIN,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Set-Cookie"],
};

// 1. MIDDLEWARES DE BASE (ordre important)
app.use(compression());
app.use(cors(corsOptions));
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Rate limiting (APIs uniquement)
app.use("/api/", apiLimiter);

// 2. FICHIERS STATIQUES PUBLIC AVANT AUTH
const publicDir = path.join(__dirname, "public");
app.use(
  "/public",
  express.static(publicDir, {
    maxAge: "7d",
    immutable: true,
  }),
);

// Avatar par défaut
const defaultAvatarDir = path.join(__dirname, "public", "avatar");
app.use(
  "/public/avatars",
  express.static(defaultAvatarDir, {
    maxAge: "365d",
    immutable: true,
  }),
);
setTimeout(async () => {
  try {
    console.log("🔍 Vérification d'Ollama en arrière-plan...");
    const test = await ollamaService.test();

    if (test.success) {
      console.log("\n✅ Ollama est accessible");
    } else {
      console.log("\n⚠️ Ollama n'est pas encore prêt");
      console.log(
        "👉 Le serveur continuera à fonctionner, les quiz seront générés quand Ollama sera disponible",
      );
    }
  } catch (error) {
    console.log("⚠️ Impossible de contacter Ollama pour le moment");
  }
}, 5000); // Attendre 5 secondes avant de tester
// 3. IMPORT DES MIDDLEWARES D'AUTH
const { verifyToken } = require("./middlewares/authMiddleware");

// 4. IMPORT DES ROUTES
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const documentRoutes = require("./routes/documentRoutes");
const quizRoutes = require("./routes/quizRoutes");
const answerRoutes = require("./routes/answerRoutes");
const friendRoutes = require("./routes/friendRoutes");
const messageRoutes = require("./routes/messageRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const userQuizzesRoutes = require("./routes/userQuizzesRoutes");

// 5. ROUTES SANS AUTHENTIFICATION
app.use("/api/auth", authRoutes);

// 6. MIDDLEWARE D'AUTHENTIFICATION GLOBAL POUR LES AUTRES ROUTES
app.use("/api", verifyToken);

// 7. ROUTES PROTÉGÉES (après verifyToken)
app.use("/api/users", userRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/answers", answerRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/my-quizzes", userQuizzesRoutes);

// Initialiser Qdrant
const { initializeCollection } = require("./config/qdrant");
initializeCollection().catch((err) => {
  console.error("⚠️ Erreur initialisation Qdrant:", err.message);
});
// 8. FICHIERS UPLOADÉS (protégés par auth via middleware personnalisé)
const uploadsDir = path.join(__dirname, "uploads");
app.use(
  "/uploads",
  (req, res, next) => {
    // Vérifier si l'utilisateur est authentifié pour les uploads
    // ou permettre les avatars publics
    if (req.path.startsWith("/avatars/") && req.path.includes("default")) {
      // Autoriser les avatars par défaut
      next();
    } else {
      // Pour les autres fichiers, vérifier l'authentification
      verifyToken(req, res, next);
    }
  },
  express.static(uploadsDir, {
    maxAge: "1d",
  }),
);

// 9. AVATARS UPLOADÉS (spécifique)
const customAvatarDir = path.join(__dirname, "uploads", "avatars");
app.use(
  "/uploads/avatars",
  verifyToken,
  express.static(customAvatarDir, {
    maxAge: "7d",
  }),
);

// 10. SETUP SOCKET.IO
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// UNE SEULE déclaration de onlineUsers
const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log(`Nouvelle connexion Socket.IO: ${socket.id}`);

  const userId = socket.handshake.query.userId;
  console.log(`Socket ${socket.id} associé à l'utilisateur: ${userId}`);

  if (userId) {
    // Stocker la connexion
    onlineUsers.set(userId, socket.id);

    // Mettre à jour le statut dans la base de données
    User.update({ isOnline: true }, { where: { id: userId } })
      .then(() => {
        console.log(`Utilisateur ${userId} marqué comme en ligne`);
      })
      .catch((err) => {
        console.error(`Erreur mise à jour statut en ligne:`, err);
      });

    console.log(`Utilisateur ${userId} en ligne (socket: ${socket.id})`);

    // Notifier TOUS les utilisateurs que cet utilisateur est en ligne
    io.emit("user_online", parseInt(userId));

    // Rejoindre la room utilisateur
    socket.join(`user_${userId}`);

    // Envoyer la liste des utilisateurs en ligne à ce nouvel utilisateur
    socket.emit(
      "online_users",
      [...onlineUsers.keys()].map((id) => parseInt(id)),
    );
  }

  socket.on("get_online_users", () => {
    console.log(`Demande utilisateurs en ligne de ${socket.id}`);
    socket.emit(
      "online_users",
      [...onlineUsers.keys()].map((id) => parseInt(id)),
    );
  });

  socket.on("join_user_room", (userId) => {
    if (!userId) return;
    socket.join(`user_${userId}`);
    console.log(`Socket ${socket.id} rejoint user_${userId}`);
  });

  // Gestion de la déconnexion
  socket.on("disconnect", () => {
    console.log(`Déconnexion Socket.IO: ${socket.id}`);

    for (const [id, sId] of onlineUsers.entries()) {
      if (sId === socket.id) {
        onlineUsers.delete(id);

        // Mettre à jour le statut dans la base de données
        User.update({ isOnline: false }, { where: { id: id } })
          .then(() => {
            console.log(`Utilisateur ${id} marqué comme hors ligne`);
          })
          .catch((err) => {
            console.error(`Erreur mise à jour statut hors ligne:`, err);
          });

        // Notifier TOUS les utilisateurs que cet utilisateur est hors ligne
        io.emit("user_offline", parseInt(id));
        console.log(`Utilisateur ${id} hors ligne`);
        break;
      }
    }
  });

  socket.on("error", (error) => {
    console.error("Erreur Socket.IO:", error);
  });
});

const {
  setupMessageSocketHandlers,
} = require("./controllers/messageController");
setupMessageSocketHandlers(io);
const { setupQuizSocketHandlers } = require("./sockets/quizSocketHandlers");
setupQuizSocketHandlers(io);
// Export io globalement
global.io = io;

// 11. GESTION DES ERREURS 404
app.use((req, res, next) => {
  res.status(404).json({
    message: "Route non trouvée",
    path: req.path,
    method: req.method,
  });
});

// 12. MIDDLEWARE DE GESTION D'ERREURS GLOBAL
app.use((err, req, res, next) => {
  console.error("Erreur serveur:", err.stack);

  // Erreur d'authentification
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({
      message: "Token d'authentification invalide ou expiré",
    });
  }

  // Erreur Sequelize
  if (err.name && err.name.includes("Sequelize")) {
    return res.status(500).json({
      message: "Erreur de base de données",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }

  res.status(err.status || 500).json({
    message: err.message || "Erreur serveur interne",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// 13. DÉMARRAGE DU SERVEUR
sequelize
  .sync()
  .then(() => {
    const PORT = process.env.SERVER_PORT || 5000;
    server.listen(PORT, () => {
      console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
      console.log(`📡 Socket.IO actif sur le même port`);
      console.log(`🌍 CORS autorisé pour: ${CLIENT_ORIGIN}`);
    });
  })
  .catch((error) => {
    console.error("❌ Erreur de synchronisation de la base de données:", error);
    process.exit(1);
  });

module.exports = { app, server, io };
