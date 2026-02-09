const { Friend, User } = require("../models/Association");
const { Op } = require("sequelize");

const sendFriendRequest = async (req, res) => {
  try {
    const requesterId = req.user.id;
    const { addresseeId } = req.body;

    if (!addresseeId) {
      return res.status(400).json({ message: "Destinataire manquant" });
    }

    if (requesterId === addresseeId) {
      return res.status(400).json({ message: "Action impossible" });
    }

    const requester = await User.findByPk(requesterId);
    const addressee = await User.findByPk(addresseeId);

    if (!requester || !addressee) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    const existingRequest = await Friend.findOne({
      where: {
        [Op.or]: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
    });

    if (existingRequest) {
      if (existingRequest.status === "attente") {
        return res.status(400).json({
          message:
            existingRequest.requesterId === requesterId
              ? "Demande déjà envoyée"
              : "Vous avez déjà reçu une demande de cet utilisateur",
        });
      }

      if (existingRequest.status === "accepter") {
        return res.status(400).json({ message: "Déjà amis" });
      }

      if (existingRequest.status === "refuser") {
        await existingRequest.destroy();
      }
    }

    // Création
    const request = await Friend.create({
      requesterId,
      addresseeId,
      status: "attente",
    });

    // Récupération avec user
    const requestWithUser = await Friend.findByPk(request.id, {
      include: [
        {
          model: User,
          as: "requester",
          attributes: ["id", "userName", "userPhoto"],
        },
      ],
    });
    if (global.io) {
      global.io.to(`user_${addresseeId}`).emit("friend_request_received", {
        requestId: request.id,
        sender: {
          id: requester.id,
          name: requester.userName,
          image: requester.userPhoto,
        },
      });
    }
    // 4️ Sécurité : resync global
    global.io.to(`user_${addresseeId}`).emit("friends_updated");

    res.status(201).json({
      ...requestWithUser.toJSON(),
      message: "Demande d'amitié envoyée",
    });
  } catch (error) {
    console.error("Erreur envoi demande:", error);
    res.status(500).json({
      message:
        error.name === "SequelizeUniqueConstraintError"
          ? "Relation déjà existante"
          : "Erreur serveur",
    });
  }
};

const getSentRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await Friend.findAll({
      where: { requesterId: userId, status: "attente" },
      include: [
        {
          model: User,
          as: "addressee",
          attributes: ["id", "userName", "userPhoto"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({
      requests,
    });
  } catch (error) {
    console.error("Erreur getSentRequests:", error);
    res.status(500).json({
      message: "Erreur serveur",
    });
  }
};

const getReceivedRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const requests = await Friend.findAll({
      where: { addresseeId: userId, status: "attente" },
      include: [
        {
          model: User,
          as: "requester",
          attributes: ["id", "userName", "userPhoto"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json({
      requests,
    });
  } catch (error) {
    console.error("Erreur getReceivedRequests:", error);
    res.status(500).json({
      message: "Erreur serveur",
    });
  }
};

const respondToRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    if (!["accepter", "refuser"].includes(status)) {
      return res.status(400).json({
        message: "Statut invalide",
      });
    }

    const request = await Friend.findByPk(requestId, {
      include: [
        { model: User, as: "requester" },
        { model: User, as: "addressee" },
      ],
    });

    if (!request) {
      return res.status(404).json({
        message: "Demande introuvable",
      });
    }

    if (request.addresseeId !== userId) {
      return res.status(403).json({
        message: "Accès refusé",
      });
    }

    if (request.status !== "attente") {
      return res.status(400).json({
        message: "Demande déjà traitée",
      });
    }

    request.status = status;
    if (status === "accepter") {
      request.acceptedAt = new Date();
    } else {
      request.rejectedAt = new Date();
    }

    await request.save();
    if (global.io) {
      const userData =
        status === "accepter"
          ? {
              id: request.addressee.id,
              name: request.addressee.userName,
              image: request.addressee.userPhoto,
            }
          : null;

      global.io
        .to(`user_${request.requesterId}`)
        .emit("friend_request_responded", {
          responderId: request.addressee.id,
          status,
          user: userData,
        });

      // Également notifier les deux parties pour mise à jour en temps réel
      global.io
        .to(`user_${request.requesterId}`)
        .to(`user_${request.addresseeId}`)
        .emit("friends_updated");
    }

    res.json({
      ...request.toJSON(),
      message: status === "accepter" ? "Demande acceptée" : "Demande refusée",
    });
  } catch (error) {
    console.error("Erreur réponse:", error);
    res.status(500).json({
      message: "Erreur serveur",
    });
  }
};

const cancelRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;

    const request = await Friend.findByPk(requestId);

    if (!request) {
      return res.status(404).json({
        message: "Demande introuvable",
      });
    }

    if (request.requesterId !== userId) {
      return res.status(403).json({
        message: "Accès refusé",
      });
    }

    if (request.status !== "attente") {
      return res.status(400).json({
        message: "Demande déjà traitée",
      });
    }

    await request.destroy();
    if (global.io) {
      global.io
        .to(`user_${request.addresseeId}`)
        .emit("friend_request_cancelled", {
          requestId: request.id,
        });
      global.io
        .to(`user_${request.requesterId}`)
        .to(`user_${request.addresseeId}`)
        .emit("friends_updated");
    }

    res.json({
      message: "Demande annulée",
    });
  } catch (error) {
    console.error("Erreur cancelRequest:", error);
    res.status(500).json({
      message: "Erreur serveur",
    });
  }
};

const getFriends = async (req, res) => {
  try {
    const userId = req.user.id;

    const friendships = await Friend.findAll({
      where: {
        status: "accepter",
        [Op.or]: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: [
        {
          model: User,
          as: "requester",
          attributes: ["id", "userName", "userPhoto", "isOnline"],
        },
        {
          model: User,
          as: "addressee",
          attributes: ["id", "userName", "userPhoto", "isOnline"],
        },
      ],
    });

    const friends = friendships.map((f) => {
      const friend = f.requesterId === userId ? f.addressee : f.requester;
      return {
        friendshipId: f.id,
        friend: {
          id: friend.id,
          userName: friend.userName,
          userPhoto: friend.userPhoto,
          isOnline: friend.isOnline,
        },
        since: f.acceptedAt || f.updatedAt,
      };
    });

    res.json({
      friends,
    });
  } catch (error) {
    console.error("Erreur getFriends:", error);
    res.status(500).json({
      message: "Erreur serveur",
    });
  }
};

const getFriendshipDate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { friendId } = req.params;

    const friendship = await Friend.findOne({
      where: {
        status: "accepter",
        [Op.or]: [
          { requesterId: userId, addresseeId: friendId },
          { requesterId: friendId, addresseeId: userId },
        ],
      },
      attributes: ["acceptedAt"],
    });

    if (!friendship || !friendship.acceptedAt) {
      return res.status(404).json({
        message: "Amitié non trouvée",
      });
    }

    const date = new Date(friendship.acceptedAt);

    res.json({
      acceptedAt: friendship.acceptedAt,
      formattedDate: {
        day: date.getDate(),
        month: date.getMonth() + 1,
        year: date.getFullYear(),
      },
    });
  } catch (error) {
    console.error("Erreur getFriendshipDate:", error);
    res.status(500).json({
      message: "Erreur serveur",
    });
  }
};
const removeFriend = async (req, res) => {
  try {
    const userId = req.user.id;
    const { friendId } = req.params;

    const friendship = await Friend.findOne({
      where: {
        status: "accepter",
        [Op.or]: [
          { requesterId: userId, addresseeId: friendId },
          { requesterId: friendId, addresseeId: userId },
        ],
      },
    });

    if (!friendship) {
      return res.status(404).json({
        message: "Amitié non trouvée",
      });
    }

    await friendship.destroy();

    if (global.io) {
      global.io.to(`user_${userId}`).emit("friendship_removed", { friendId });
      global.io.to(`user_${friendId}`).emit("friendship_removed", { friendId });

      // Mise à jour globale
      global.io
        .to(`user_${userId}`)
        .to(`user_${friendId}`)
        .emit("friends_updated");
    }

    res.json({
      message: "Ami supprimé",
    });
  } catch (error) {
    console.error("Erreur removeFriend:", error);
    res.status(500).json({
      message: "Erreur serveur",
    });
  }
};

module.exports = {
  sendFriendRequest,
  getSentRequests,
  getReceivedRequests,
  respondToRequest,
  cancelRequest,
  getFriends,
  getFriendshipDate,
  removeFriend,
};
