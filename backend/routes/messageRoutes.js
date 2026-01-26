const express = require("express");
const router = express.Router();
const {
  sendMessage,
  getConversation,
  deleteMessage,
  getUnreadCount,
  markAsRead,
  getMediaMessages,
  getLastConversationDate,
} = require("../controllers/messageController");
const { messageLimiter } = require("../middlewares/ratelimit");
const { validateMessage } = require("../middlewares/validationMiddleware");

router.post("/", messageLimiter, validateMessage, sendMessage);
router.get("/conversation/:otherUserId", getConversation);
router.delete("/:messageId", deleteMessage);
router.get("/unread", getUnreadCount);
router.post("/:senderId/read", markAsRead);
router.get("/:friendId/media", getMediaMessages);
router.get("/:friendId/last-date", getLastConversationDate);

module.exports = router;
