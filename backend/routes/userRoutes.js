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
} = require("../controllers/userController");
const {
  uploadProfilePhoto,
  uploadBackground,
  validateFile,
} = require("../middlewares/uploads");

router.get("/me", getCurrentUser);
router.get("/", getAllUsers);
router.get("/:id", getUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);
router.get("/check-token", checkTokenValidity);
router.put("/:id/password", updatePassword);
router.put("/avatar", uploadProfilePhoto, validateFile, updateAvatar);
router.put("/background", uploadBackground, validateFile, updateBackground);

module.exports = router;
