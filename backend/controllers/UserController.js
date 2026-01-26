const User = require("../models/UserModel");
const bcrypt = require("bcrypt");
const { Op } = require("sequelize");

//recupérer un user
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
//recupérer tous les users
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
//supprimer un user
const deleteUser = async (req, res) => {
  try {
    if (req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ message: "vous n'avez pas les droits" });
    }
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
//mettre à jour un user
const updateUser = async (req, res) => {
  try {
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ message: "vous n'avez pas les droits" });
    }
    const updateData = {};
    if (req.body.userName) updateData.userName = req.body.userName;
    if (req.body.userPassword)
      updateData.userPassword = await bcrypt.hash(req.body.userPassword, 12);
    if (req.file) {
      updateData.userPhoto = `${req.protocol}://${req.get("host")}/uploads/${
        req.file.filename
      }`;
    }
    if (req.body.background_image)
      updateData.background_image = req.body.background_image;
    const [updated] = await User.update(updateData, {
      where: { id: req.params.id },
    });
    if (!updated) {
      return res.status(500).json({ message: "utilisateur non mis à jour" });
    }
    //recuperer le user mis à jour
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ["userPassword", "validationToken"] },
    });
    return res.status(200).json({
      message: "utilisateur mis à jour",
      user,
    });
  } catch (error) {
    console.log("erreur de mise à jour de l'utilisateur", error);
    return res.status(500).json({ message: "erreur lors de la mise à jour" });
  }
};
//verifier si le token est valide
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

//update
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
// Récupérer l'utilisateur connecté (via token)
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
//update background
const updateBackground = async (req, res) => {
  try {
    if (req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ message: "Accès refusé" });
    }
    const user = await User.findByPk(req.params.id);
    if (!user)
      return res.status(404).json({ message: "Utilisateur introuvable" });

    const background = req.file
      ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`
      : null;

    user.background_image = background;
    await user.save();
    res.json({
      message: "Background mis à jour",
      background_image: background,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
const updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Aucune image fournie" });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    user.userPhoto = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    await user.save();

    return res.status(200).json({
      message: "Avatar mis à jour",
      userPhoto: user.userPhoto,
    });
  } catch (error) {
    console.error("Erreur updateAvatar:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
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
  updateAvatar,
};
