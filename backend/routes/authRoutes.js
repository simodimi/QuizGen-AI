const express = require("express");
const router = express.Router();
const {
  createUser,
  validateUserBytoken,
  loginUser,
  logoutUser,
  forgotPassword,
  verifycode,
  resetPassword,
} = require("../controllers/authController");
const {
  validateRegister,
  validateLogin,
} = require("../middlewares/validationMiddleware");
const { registerLimiter } = require("../middlewares/ratelimit");

router.post("/register", registerLimiter, validateRegister, createUser);
router.post("/login", validateLogin, loginUser);
router.post("/logout", logoutUser);
router.get("/validate/:token", validateUserBytoken);
router.post("/forgot-password", forgotPassword);
router.post("/verify-code", verifycode);
router.post("/reset-password", resetPassword);

module.exports = router;
