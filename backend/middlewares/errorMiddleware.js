// Gestionnaire d'erreurs global
/*const errorHandler = (err, req, res, next) => {
  console.error("Erreur:", err.stack);

  // Erreurs spécifiques
  if (err.name === "ValidationError") {
    return res.status(400).json({
      message: "Erreur de validation",
      errors: err.errors || err.message,
    });
  }

  if (err.name === "SequelizeUniqueConstraintError") {
    return res.status(409).json({
      message: "Conflit de données",
      errors: err.errors.map((e) => e.message),
    });
  }

  if (err.name === "SequelizeForeignKeyConstraintError") {
    return res.status(400).json({
      message: "Référence invalide",
      error: "La ressource référencée n'existe pas",
    });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ message: "Token JWT invalide" });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ message: "Token JWT expiré" });
  }

  // Erreur multer (upload)
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      message: "Fichier trop volumineux",
      maxSize: "120MB",
    });
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      message: "Nombre de fichiers dépassé",
      maxFiles: "10",
    });
  }

  // Erreur par défaut
  const statusCode = err.statusCode || 500;
  const message = err.message || "Une erreur est survenue";

  res.status(statusCode).json({
    message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};*/

// Middleware pour les routes non trouvées
const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Route non trouvée - ${req.originalUrl}`));
};

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

module.exports = { notFound, errorHandler };
