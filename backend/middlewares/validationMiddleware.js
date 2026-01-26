const { body, param, query, validationResult } = require("express-validator");

// Validation pour l'inscription
const validateRegister = [
  body("userName")
    .trim()
    .notEmpty()
    .withMessage("Le nom d'utilisateur est requis")
    .isLength({ min: 3, max: 50 })
    .withMessage("Le nom doit contenir entre 3 et 50 caractères"),

  body("userEmail")
    .trim()
    .notEmpty()
    .withMessage("L'email est requis")
    .isEmail()
    .withMessage("Email invalide")
    .normalizeEmail(),

  body("userPassword")
    .notEmpty()
    .withMessage("Le mot de passe est requis")
    .isLength({ min: 6 })
    .withMessage("Le mot de passe doit contenir au moins 6 caractères"),

  body("userPasswordAgain")
    .notEmpty()
    .withMessage("La confirmation du mot de passe est requise")
    .custom((value, { req }) => {
      if (value !== req.body.userPassword) {
        throw new Error("Les mots de passe ne correspondent pas");
      }
      return true;
    }),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

// Validation pour la connexion
const validateLogin = [
  body("userEmail")
    .trim()
    .notEmpty()
    .withMessage("L'email est requis")
    .isEmail()
    .withMessage("Email invalide"),

  body("userPassword").notEmpty().withMessage("Le mot de passe est requis"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

// Validation pour les messages
const validateMessage = [
  body("content")
    .optional()
    .isLength({ max: 2000 })
    .withMessage("Le message ne doit pas dépasser 2000 caractères"),

  body("receiverId")
    .notEmpty()
    .withMessage("Le destinataire est requis")
    .isInt()
    .withMessage("ID du destinataire invalide"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

// Validation pour les demandes d'amis
const validateFriendRequest = [
  body("addresseeId")
    .notEmpty()
    .withMessage("L'ID du destinataire est requis")
    .isInt()
    .withMessage("ID invalide"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

// Validation pour les status
const validateStatus = [
  body("items").isArray().withMessage("Les items doivent être un tableau"),
  body("expiresAt")
    .notEmpty()
    .withMessage("La date d'expiration est requise")
    .isISO8601()
    .withMessage("Format de date invalide"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

// Middleware de validation générique
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({ errors: errors.array() });
  };
};

module.exports = {
  validateRegister,
  validateLogin,
  validateMessage,
  validateFriendRequest,
  validateStatus,
  validate,
};
