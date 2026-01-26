const express = require("express");
const router = express.Router();
const {
  getCreatedQuizzes,
  getParticipatingQuizzes,
  getPendingQuizzes,
  getActiveQuizzes,
  getCompletedQuizzes,
  getAllUserQuizzes,
  getUserQuizzesStats,
} = require("../controllers/userQuizzesController");

router.get("/created", getCreatedQuizzes);
router.get("/participating", getParticipatingQuizzes);
router.get("/pending", getPendingQuizzes);
router.get("/active", getActiveQuizzes);
router.get("/completed", getCompletedQuizzes);
router.get("/all", getAllUserQuizzes);
router.get("/stats", getUserQuizzesStats);

module.exports = router;
