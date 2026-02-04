const jwt = require("jsonwebtoken");
const User = require("../models/User");

const verifyToken = async (req, res, next) => {
  try {
    // Récupérer le token depuis cookies ou header
    const token =
      req.cookies?.token ||
      req.headers.authorization?.split(" ")[1] ||
      req.headers["x-access-token"];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token d'authentification manquant",
      });
    }
    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Récupérer l'utilisateur
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ["userPassword", "validationToken"] },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Compte non activé. Vérifiez votre email.",
      });
    }

    // Ajouter l'utilisateur à la requête
    req.user = {
      id: user.id,
      userName: user.userName,
      userEmail: user.userEmail,
      userPhoto: user.userPhoto,
      statut: user.statut,
      isOnline: user.isOnline,
    };

    // Mettre à jour la dernière connexion
    user.last_login = new Date();
    await user.save();

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expiré. Reconnectez-vous.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Token invalide",
      });
    }

    console.error("Erreur vérification token:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur d'authentification",
    });
  }
};

const socketAuth = (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1];

    if (!token) {
      return next(new Error("UNAUTHORIZED"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (error) {
    next(new Error("UNAUTHORIZED"));
  }
};

module.exports = {
  verifyToken,
  socketAuth,
};
