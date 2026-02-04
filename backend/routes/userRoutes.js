const express = require("express");
const router = express.Router();
const {
  getCurrentUser,
  getUser,
  getAllUsers,
  updateUser,
  deleteUser,
  checkTokenValidity,
  updatePassword,
  updateAvatar,
  updateBackground,
  getCurrentAvatar,
  changeAvatar,
  removeCustomAvatar,
  getDefaultAvatars,
  updateColor,
} = require("../controllers/userController");
const {
  uploadProfilePhoto,
  uploadBackground,
  validateFile,
  validateAvatarFile,
  uploadAvatar,
} = require("../middlewares/uploads");

// Routes pour les avatars
router.get("/avatars/default", getDefaultAvatars);
//router.get("/avatars/me", getCurrentAvatar);
router.put(
  "/:id",
  uploadAvatar.single("avatar"),
  validateAvatarFile,
  updateUser,
);
//router.delete("/avatars/remove-custom", removeCustomAvatar);

router.get("/me", getCurrentUser);
router.get("/", getAllUsers);
router.get("/:id", getUser);
//router.put("/:id", uploadProfilePhoto, validateFile, updateUser);
router.delete("/:id", deleteUser);
router.get("/check-token", checkTokenValidity);
//router.put("/:id/password", updatePassword);
//router.put("/avatar", uploadProfilePhoto, validateFile, updateAvatar);
router.put("/:id/background", uploadBackground, validateFile, updateBackground);
//couleur texte
router.put("/:id/police", updateColor);
module.exports = router;
