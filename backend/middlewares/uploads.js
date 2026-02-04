const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Créer les dossiers nécessaires
const uploadsDir = path.join(__dirname, "../uploads");
const avatarsDir = path.join(uploadsDir, "avatars");
const publicAvatarDir = path.join(__dirname, "../public/avatars");

// Créer les dossiers s'ils n'existent pas
[uploadsDir, avatarsDir, publicAvatarDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configuration du stockage pour les avatars personnalisés
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "avatar-" + uniqueSuffix + ext);
  },
});

// Configuration du stockage générique (pour rétrocompatibilité)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// Filtres de fichiers
const avatarFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Seules les images sont autorisées pour l'avatar"));
  }
};

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

// Configurations d'upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: fileFilter,
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max pour les avatars
  },
  fileFilter: avatarFileFilter,
});

// Middleware spécifique
const uploadProfilePhoto = uploadAvatar.single("avatar");
const uploadBackground = upload.single("background");
const uploadMessageFile = upload.single("messageFile");
const uploadStatusMedia = upload.single("statusMedia");

// Middleware de validation du fichier
const validateFile = (req, res, next) => {
  if (!req.file) {
    return next();
  }

  if (req.file.size > 50 * 1024 * 1024) {
    return res
      .status(400)
      .json({ message: "Fichier trop volumineux (max 50MB)" });
  }

  next();
};

// Validation spécifique pour les avatars
const validateAvatarFile = (req, res, next) => {
  if (!req.file) {
    return next();
  }

  if (req.file.size > 5 * 1024 * 1024) {
    return res
      .status(400)
      .json({ message: "Avatar trop volumineux (max 5MB)" });
  }

  next();
};

module.exports = {
  upload,
  uploadAvatar,
  uploadProfilePhoto,
  uploadMessageFile,
  uploadStatusMedia,
  uploadBackground,
  validateFile,
  validateAvatarFile,
};
