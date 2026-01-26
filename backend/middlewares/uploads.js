const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Créer le dossier uploads s'il n'existe pas
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuration du stockage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// Filtre des fichiers
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|pdf|mp3|wav/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Type de fichier non autorisé"));
  }
};

// Configuration de l'upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 10MB max
  },
  fileFilter: fileFilter,
});

// Middleware spécifique pour les photos de profil
const uploadProfilePhoto = upload.single("userPhoto");

//background
const uploadBackground = upload.single("background");

// Middleware de validation du fichier
const validateFile = (req, res, next) => {
  if (!req.file) {
    return next(); // Pas de fichier, c'est OK
  }

  // Vérifier la taille du fichier
  if (req.file.size > 50 * 1024 * 1024) {
    return res
      .status(400)
      .json({ message: "Fichier trop volumineux (max 10MB)" });
  }

  next();
};

module.exports = {
  upload,
  uploadProfilePhoto,
  uploadMessageFile,
  uploadStatusMedia,
  uploadBackground,
  validateFile,
};
