const express = require("express");
const router = express.Router();
const {
  getUserStats,
  getGlobalLeaderboard,
  getFriendsLeaderboard,
  getQuizHistory,
  getPerformanceByTheme,
} = require("../controllers/dashboardController");

router.get("/stats", getUserStats);
router.get("/leaderboard", getGlobalLeaderboard);
router.get("/friends-leaderboard", getFriendsLeaderboard);
router.get("/history", getQuizHistory);
router.get("/performance", getPerformanceByTheme);

module.exports = router;
