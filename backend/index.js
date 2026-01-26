const express = require("express");
const cors = require("cors");
require("dotenv").config();
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const http = require("http");
const path = require("path");
const { sequelize } = require("./models");
const rateLimit = require("express-rate-limit");
const { errorHandler, notFound } = require("./middlewares/errorMiddleware");
const { initSockets } = require("./socket");
const compression = require("compression");
const db = require("../backend/config/database");

const app = express();
const server = http.createServer(app);

// Middleware de compression (IMPORTANT pour les performances)
app.use(compression());

// Configuration CORS
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const corsOptions = {
  origin: CLIENT_ORIGIN,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Content-Length", "X-Response-Time"],
};

app.use(cors(corsOptions));

// Sécurité Helmet avec configuration optimisée
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", CLIENT_ORIGIN],
      },
    },
  }),
);

// Body parsers avec limites ajustées
app.use(
  express.urlencoded({
    extended: true,
    limit: "50mb",
    parameterLimit: 100000,
  }),
);

app.use(
  express.json({
    limit: "50mb",
    inflate: true,
    strict: true,
  }),
);

app.use(cookieParser());

// Rate limiting ajusté
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requêtes par IP
  message: {
    success: false,
    message:
      "Trop de requêtes depuis cette IP, veuillez réessayer dans 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    return req.ip; // Utiliser l'IP réelle
  },
});

app.use("/api/", limiter);

// Initialisation Socket.io
const io = initSockets(server); //RÉCUPÉRER L'INSTANCE IO

// Middleware pour injecter io dans les requêtes (TRÈS IMPORTANT)
app.use((req, res, next) => {
  req.io = io; // AJOUT CRITIQUE pour que les controllers puissent émettre des events
  next();
});

// Exposition globale de io (alternative)
global.io = io;

// Routes statiques avec cache control
app.use(
  "/uploads",
  express.static(uploadsDir, {
    maxAge: "1d",
    setHeaders: (res, path) => {
      if (path.endsWith(".pdf") || path.endsWith(".docx")) {
        res.set("Cache-Control", "public, max-age=86400");
      }
    },
  }),
);

app.use(
  "/public",
  express.static(publicDir, {
    maxAge: "7d",
    immutable: true,
  }),
);

// Import des middlewares
const { verifyToken } = require("./middlewares/authMiddleware");

// Import des routes (vérifier que tous existent)
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const documentRoutes = require("./routes/documentRoutes");
const quizRoutes = require("./routes/quizRoutes");
const answerRoutes = require("./routes/answerRoutes");
const friendRoutes = require("./routes/friendRoutes");
const messageRoutes = require("./routes/messageRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const userQuizzesRoutes = require("./routes/userQuizzesRoutes");

// Vérification que toutes les routes existent
const routes = {
  authRoutes,
  userRoutes,
  documentRoutes,
  quizRoutes,
  answerRoutes,
  friendRoutes,
  messageRoutes,
  dashboardRoutes,
  userQuizzesRoutes,
};

Object.entries(routes).forEach(([name, route]) => {
  if (!route) {
    console.error(`Route manquante: ${name}`);
    process.exit(1);
  }
});

// Montage des routes avec préfixe API et logging
app.use("/api/auth", authRoutes);
app.use("/api/users", verifyToken, userRoutes);
app.use("/api/documents", verifyToken, documentRoutes);
app.use("/api/quizzes", verifyToken, quizRoutes);
app.use("/api/answers", verifyToken, answerRoutes);
app.use("/api/friends", verifyToken, friendRoutes);
app.use("/api/messages", verifyToken, messageRoutes);
app.use("/api/dashboard", verifyToken, dashboardRoutes);
app.use("/api/my-quizzes", verifyToken, userQuizzesRoutes);

// Logging middleware pour le debug
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.originalUrl}`);
    next();
  });
}

// Route de test complète
app.get("/api/health", (req, res) => {
  const healthcheck = {
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "QuizGen AI Backend",
    version: "1.0.0",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: "connected",
    sockets: io.engine.clientsCount,
    environment: process.env.NODE_ENV || "development",
  };

  res.json(healthcheck);
});

// Route de test publique (sans auth)
app.get("/api/public/test", (req, res) => {
  res.json({
    success: true,
    message: "API publique accessible",
    timestamp: new Date().toISOString(),
  });
});

// Gestion des erreurs 404 API
app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route API non trouvée",
    path: req.originalUrl,
    method: req.method,
    availableRoutes: [
      "/api/auth/*",
      "/api/users/*",
      "/api/documents/*",
      "/api/quizzes/*",
      "/api/answers/*",
      "/api/friends/*",
      "/api/messages/*",
      "/api/dashboard/*",
      "/api/my-quizzes/*",
      "/api/health",
      "/api/public/test",
    ],
  });
});

// Gestionnaire d'erreurs global
app.use(errorHandler);

// Route 404 générale (pour les routes non-API)
app.use(notFound);

/*// Gestion des erreurs non catchées
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Ne pas exit en développement
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});*/

// Synchronisation de la base de données et démarrage du serveur
const PORT = process.env.PORT || 5000;
db.sync() /*{alter: true}*/
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Serveur démarré sur le port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Erreur de synchronisation de la base de données:", error);
    process.exit(1);
  });

// Export pour les tests
module.exports = { app, server, io };
