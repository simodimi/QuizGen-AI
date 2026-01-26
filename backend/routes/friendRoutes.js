const express = require("express");
const router = express.Router();
const {
  sendFriendRequest,
  getSentRequests,
  getReceivedRequests,
  respondToRequest,
  cancelRequest,
  getFriends,
  getFriendshipDate,
} = require("../controllers/friendController");
const { friendRequestLimiter } = require("../middlewares/ratelimit");
const {
  validateFriendRequest,
} = require("../middlewares/validationMiddleware");

router.post(
  "/request",
  friendRequestLimiter,
  validateFriendRequest,
  sendFriendRequest,
);
router.get("/sent", getSentRequests);
router.get("/received", getReceivedRequests);
router.post("/:requestId/respond", respondToRequest);
router.delete("/:requestId", cancelRequest);
router.get("/", getFriends);
router.get("/:friendId/date", getFriendshipDate);

module.exports = router;
