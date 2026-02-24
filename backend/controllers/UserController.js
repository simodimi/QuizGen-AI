const User = require("../models/User");
const bcrypt = require("bcrypt");
const { Op } = require("sequelize");
const fs = require("fs").promises;
const path = require("path");

// Liste des avatars par défaut
const DEFAULT_AVATARS = [
  "A1.jpg",
  "A2.jpg",
  "A3.jpg",
  "A4.jpg",
  "A5.jpg",
  "A6.jpg",
  "A7.jpg",
  "A8.jpg",
  "A9.jpg",
  "A10.jpg",
  "A11.jpg",
  "A12.jpg",
  "A13.jpg",
  "A14.jpg",
  "A15.jpg",
  "A16.jpg",
  "A17.jpg",
  "A18.jpg",
  "A19.jpg",
  "A20.jpg",
];
const FALLBACK_AVATAR = "no.jpg";
// Fonction pour supprimer l'ancien avatar si personnalisé
const deleteOldAvatarIfExists = async (user) => {
  if (user.avatarType !== "custom" || !user.avatarFileName) {
    return;
  }

  const oldAvatarPath = path.join(
    __dirname,
    "..",
    "uploads",
    "avatars",
    user.avatarFileName,
  );

  try {
    await fs.access(oldAvatarPath); // 🔍 vérifie l'existence
    await fs.unlink(oldAvatarPath); // 🗑️ supprime
    console.log(`Ancien avatar supprimé: ${user.avatarFileName}`);
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error("Erreur suppression avatar:", err);
    }
  }
};

// Fonction pour générer l'URL de l'avatar
const getAvatarUrl = (avatarFileName, req, isDefault = true) => {
  if (isDefault) {
    return `${req.protocol}://${req.get("host")}/public/avatars/${avatarFileName}`;
  } else {
    return `${req.protocol}://${req.get("host")}/uploads/avatars/${avatarFileName}`;
  }
};

// Récupérer les avatars par défaut disponibles
const getDefaultAvatars = async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const avatars = DEFAULT_AVATARS.map((avatar) => ({
      name: avatar,
      url: `${baseUrl}/public/avatars/${avatar}`,
      type: "default",
    }));

    res.status(200).json({
      defaultAvatars: avatars,
      total: avatars.length,
    });
  } catch (error) {
    console.error("Erreur récupération avatars:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Récupérer un user
const getUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ["userPassword", "validationToken"] },
    });
    if (!user) {
      return res.status(404).json({ message: "utilisateur introuvable" });
    }
    return res.status(200).json(user);
  } catch (error) {
    console.log("erreur de recuperation de l'utilisateur", error);
    return res.status(500).json({ message: "erreur lors de la recupération" });
  }
};

// Récupérer tous les users
const getAllUsers = async (req, res) => {
  try {
    const { search = "" } = req.query;

    const where = {};
    if (search) {
      where[Op.or] = [
        { userName: { [Op.like]: `%${search}%` } },
        { userEmail: { [Op.like]: `%${search}%` } },
      ];
    }
    const user = await User.findAll({
      attributes: { exclude: ["userPassword", "validationToken"] },
    });
    if (!user) {
      return res.status(404).json({ message: "utilisateur introuvable" });
    }
    return res.status(200).json(user);
  } catch (error) {
    console.log("erreur de recuperation de l'utilisateur", error);
    return res.status(500).json({ message: "erreur lors de la recupération" });
  }
};

// Supprimer un user
const deleteUser = async (req, res) => {
  try {
    if (req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ message: "vous n'avez pas les droits" });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Supprimer l'avatar personnalisé si existe
    await deleteOldAvatarIfExists(user);

    const deleted = await User.destroy({
      where: { id: req.params.id },
    });
    if (!deleted) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    res.clearCookie("token");
    return res.status(200).json({ message: "Utilisateur supprimé" });
  } catch (error) {
    console.log("erreur de suppression de l'utilisateur", error);
    res.status(500).json({ message: "erreur lors de la suppression" });
  }
};

const updateUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (req.user.id !== userId) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    // Nom
    if (req.body.userName) {
      user.userName = req.body.userName;
    }
    // Suppression avatar → revenir à no.jpg
    if (req.body.removeAvatar === "true") {
      await deleteOldAvatarIfExists(user);
      user.avatarFileName = null;
      user.userPhoto = `${req.protocol}://${req.get("host")}/public/avatars/no.jpg`;
      user.avatarType = "default";
      user.avatarFileName = "no.jpg";
    }

    // Avatar uploadé
    else if (req.file) {
      await deleteOldAvatarIfExists(user);

      user.userPhoto = `${req.protocol}://${req.get("host")}/uploads/avatars/${req.file.filename}`;
      user.avatarType = "custom";
      user.avatarFileName = req.file.filename;
    }

    // Avatar par défaut
    if (req.body.defaultAvatar) {
      await deleteOldAvatarIfExists(user);

      const avatarName = req.body.defaultAvatar.split("/").pop();

      user.userPhoto = `${req.protocol}://${req.get("host")}/public/avatars/${avatarName}`;
      user.avatarType = "default";
      user.avatarFileName = avatarName;
    }

    // Mot de passe
    if (req.body.newPassword) {
      const isMatch = await bcrypt.compare(
        req.body.currentPassword,
        user.userPassword,
      );

      if (!isMatch) {
        return res.status(400).json({ message: "Mot de passe incorrect" });
      }

      user.userPassword = await bcrypt.hash(req.body.newPassword, 12);
    }

    await user.save();

    const safeUser = await User.findByPk(userId, {
      attributes: { exclude: ["userPassword", "validationToken"] },
    });

    return res.status(200).json({
      message: "Profil mis à jour",
      user: safeUser,
    });
  } catch (error) {
    console.error("updateUser error:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

// Vérifier si le token est valide
const checkTokenValidity = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ["userPassword", "validationToken"] },
    });
    if (!user) {
      return res
        .status(401)
        .json({ message: "utilisateur introuvable", valid: false });
    }
    return res.status(200).json({
      message: "utilisateur actif",
      valid: true,
      user,
    });
  } catch (error) {
    console.log("erreur de verification de l'utilisateur", error);
    return res.status(500).json({ message: "erreur lors de la verification" });
  }
};

// Mettre à jour le mot de passe
const updatePassword = async (req, res) => {
  try {
    if (req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ message: "vous n'avez pas les droits" });
    }
    const { userPassword, newPassword } = req.body;
    if (!userPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "veuillez remplir tous les champs" });
    }
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "utilisateur introuvable" });
    }
    const isMatch = await bcrypt.compare(userPassword, user.userPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "mot de passe incorrect" });
    }
    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(newPassword, salt);
    user.userPassword = hashed;
    await user.save();
    return res.status(200).json({ message: "mot de passe mis à jour" });
  } catch (error) {
    console.log("erreur de mise à jour de mot de passe", error);
    return res.status(500).json({ message: "erreur lors de la mise à jour" });
  }
};

// Récupérer l'utilisateur connecté
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: {
        exclude: ["userPassword", "validationToken"],
      },
    });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }
    return res.status(200).json(user);
  } catch (error) {
    console.error("Erreur getCurrentUser:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

// Mettre à jour le background
const updateBackground = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (req.user.id !== userId) {
      return res.status(403).json({ message: "Accès refusé" });
    }
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }
    // DELETE BACKGROUND
    if (String(req.body.removeBackground) === "true") {
      user.background_image = null;
      await user.save();
      const safeUser = await User.findByPk(userId, {
        attributes: { exclude: ["userPassword", "validationToken"] },
      });
      return res.json({
        message: "Background supprimé",
        user: safeUser,
      });
    }
    // background prédéfini
    if (req.body.defaultBackground) {
      user.background_image = req.body.defaultBackground;
    }
    // upload
    else if (req.file) {
      user.background_image = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    }
    await user.save();
    const safeUser = await User.findByPk(userId, {
      attributes: { exclude: ["userPassword", "validationToken"] },
    });

    res.json({
      message: "Background mis à jour",
      user: safeUser,
    });
  } catch (err) {
    console.error("updateBackground error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
//Mettre à jour couleur de police
const updateColor = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (req.user.id !== userId) {
      return res.status(403).json({ message: "Accès refusé" });
    }
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }
    user.policeStyle = req.body.policeStyle;
    await user.save();
    const safeUser = await User.findByPk(userId, {
      attributes: { exclude: ["userPassword", "validationToken"] },
    });
    res.json({
      message: "Couleur de police mise à jour",
      user: safeUser,
    });
  } catch (error) {}
};

module.exports = {
  getUser,
  getAllUsers,
  deleteUser,
  updateUser,
  checkTokenValidity,
  updatePassword,
  getCurrentUser,
  updateBackground,
  //updateAvatar,
  getDefaultAvatars,
  updateColor,
  //changeAvatar,
  //removeCustomAvatar,
  //getCurrentAvatar,
};
