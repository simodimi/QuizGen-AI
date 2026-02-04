const { Friend, User } = require("../models/Association");
const { Op } = require("sequelize");

const sendFriendRequest = async (req, res) => {
  try {
    const requesterId = req.user.id;
    const { receiverId } = req.body;

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: "Destinataire manquant",
      });
    }

    if (requesterId === parseInt(receiverId)) {
      return res.status(400).json({
        success: false,
        message: "Action impossible",
      });
    }

    const requester = await User.findByPk(requesterId);
    const receiver = await User.findByPk(receiverId);

    if (!requester || !receiver) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    const existingRequest = await Friend.findOne({
      where: {
        [Op.or]: [
          { requesterId, receiverId },
          { requesterId: receiverId, receiverId: requesterId },
        ],
      },
    });

    if (existingRequest) {
      if (existingRequest.status === "attente") {
        return res.status(400).json({
          success: false,
          message:
            existingRequest.requesterId === requesterId
              ? "Demande déjà envoyée"
              : "Vous avez déjà reçu une demande de cet utilisateur",
        });
      }

      if (existingRequest.status === "accepter") {
        return res.status(400).json({
          success: false,
          message: "Déjà amis",
        });
      }

      if (existingRequest.status === "refuser") {
        await existingRequest.destroy();
      }
    }

    const request = await Friend.create({
      requesterId,
      receiverId,
      status: "attente",
    });

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
      global.io.to(`user_${receiverId}`).emit("friend_request_received", {
        requestId: request.id,
        sender: {
          id: requester.id,
          name: requester.userName,
          image: requester.userPhoto,
        },
      });
    }

    res.status(201).json({
      success: true,
      ...requestWithUser.toJSON(),
      message: "Demande d'amitié envoyée",
    });
  } catch (error) {
    console.error("Erreur envoi demande:", error);
    res.status(500).json({
      success: false,
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
          as: "receiver",
          attributes: ["id", "userName", "userPhoto"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error("Erreur getSentRequests:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

const getReceivedRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await Friend.findAll({
      where: { receiverId: userId, status: "attente" },
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
      success: true,
      requests,
    });
  } catch (error) {
    console.error("Erreur getReceivedRequests:", error);
    res.status(500).json({
      success: false,
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
        success: false,
        message: "Statut invalide",
      });
    }

    const request = await Friend.findByPk(requestId, {
      include: [
        { model: User, as: "requester" },
        { model: User, as: "receiver" },
      ],
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Demande introuvable",
      });
    }

    if (request.receiverId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Accès refusé",
      });
    }

    if (request.status !== "attente") {
      return res.status(400).json({
        success: false,
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
              id: request.receiver.id,
              name: request.receiver.userName,
              image: request.receiver.userPhoto,
            }
          : null;

      global.io
        .to(`user_${request.requesterId}`)
        .emit("friend_request_responded", {
          responderId: request.receiver.id,
          status,
          user: userData,
        });
    }

    res.json({
      success: true,
      ...request.toJSON(),
      message: status === "accepter" ? "Demande acceptée" : "Demande refusée",
    });
  } catch (error) {
    console.error("Erreur réponse:", error);
    res.status(500).json({
      success: false,
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
        success: false,
        message: "Demande introuvable",
      });
    }

    if (request.requesterId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Accès refusé",
      });
    }

    if (request.status !== "attente") {
      return res.status(400).json({
        success: false,
        message: "Demande déjà traitée",
      });
    }

    await request.destroy();

    if (global.io) {
      global.io
        .to(`user_${request.receiverId}`)
        .emit("friend_request_cancelled", {
          requestId: request.id,
        });
    }

    res.json({
      success: true,
      message: "Demande annulée",
    });
  } catch (error) {
    console.error("Erreur cancelRequest:", error);
    res.status(500).json({
      success: false,
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
        [Op.or]: [{ requesterId: userId }, { receiverId: userId }],
      },
      include: [
        {
          model: User,
          as: "requester",
          attributes: ["id", "userName", "userPhoto", "isOnline"],
        },
        {
          model: User,
          as: "receiver",
          attributes: ["id", "userName", "userPhoto", "isOnline"],
        },
      ],
    });

    const friends = friendships.map((f) => {
      const friend = f.requesterId === userId ? f.receiver : f.requester;
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
      success: true,
      friends,
    });
  } catch (error) {
    console.error("Erreur getFriends:", error);
    res.status(500).json({
      success: false,
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
          { requesterId: userId, receiverId: friendId },
          { requesterId: friendId, receiverId: userId },
        ],
      },
      attributes: ["acceptedAt"],
    });

    if (!friendship || !friendship.acceptedAt) {
      return res.status(404).json({
        success: false,
        message: "Amitié non trouvée",
      });
    }

    const date = new Date(friendship.acceptedAt);

    res.json({
      success: true,
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
      success: false,
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
};
