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
  removeFriend, // IMPORTANT: Ajouter cette ligne
} = require("../controllers/friendController");
const { friendRequestLimiter } = require("../middlewares/ratelimit");
const {
  validateFriendRequest,
} = require("../middlewares/validationMiddleware");

//envoyer une demande de ami
router.post(
  "/request",
  friendRequestLimiter,
  validateFriendRequest,
  sendFriendRequest,
);

//recuperer les demandes envoyees
router.get("/sent", getSentRequests);
router.get("/received", getReceivedRequests);

//accepter ou refuser une demande
router.put("/:requestId/respond", respondToRequest); // CHANGER POST À PUT

//annuler une demande
router.delete("/:requestId", cancelRequest);

//recuperer la liste des amis
router.get("/", getFriends);

//recuperer la date de l'ami
router.get("/:friendId/date", getFriendshipDate);

//supprimer un ami
router.delete("/:friendId", removeFriend);

module.exports = router;
