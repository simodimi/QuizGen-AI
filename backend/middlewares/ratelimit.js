const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");
// Limitation globale pour les requêtes API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes max par IP
  message: {
    message: "Trop de requêtes depuis cette IP, veuillez réessayer plus tard",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limitation spécifique pour l'inscription
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 5, // 5 inscriptions max par IP par heure
  message: {
    message:
      "Trop de comptes créés depuis cette IP, veuillez réessayer dans une heure",
  },
});

// Limitation pour les demandes d'amis
const friendRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 50, // 50 demandes max par heure
  message: {
    message: "Trop de demandes d'amis envoyées, veuillez réessayer plus tard",
  },
});

// Limitation pour les messages
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 messages max par minute
  message: {
    message: "Trop de messages envoyés, veuillez ralentir",
  },
});

module.exports = {
  apiLimiter,
  registerLimiter,
  friendRequestLimiter,
  messageLimiter,
};
