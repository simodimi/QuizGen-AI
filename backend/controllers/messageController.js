const { Message, User } = require("../models/Association");
const { Op } = require("sequelize");

const sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const {
      receiverId,
      content,
      messageType = "text",
      replyToId = null,
    } = req.body;

    if (!receiverId || !content) {
      return res.status(400).json({
        success: false,
        message: "Destinataire et contenu requis",
      });
    }

    const message = await Message.create({
      senderId,
      receiverId,
      content,
      messageType,
      replyToId,
      isRead: false,
    });

    const messageWithRelations = await Message.findByPk(message.id, {
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["id", "userName", "userPhoto", "isOnline"],
        },
        {
          model: User,
          as: "receiver",
          attributes: ["id", "userName", "userPhoto"],
        },
        {
          model: Message,
          as: "replyTo",
          include: [
            {
              model: User,
              as: "sender",
              attributes: ["id", "userName", "userPhoto"],
            },
          ],
        },
      ],
    });

    if (global.io) {
      global.io
        .to(`user_${receiverId}`)
        .emit("chat:receive", messageWithRelations);
      global.io.to(`user_${senderId}`).emit("chat:sent", {
        ...messageWithRelations.toJSON(),
        status: "sent",
      });
    }

    res.status(201).json({
      success: true,
      message: messageWithRelations,
    });
  } catch (error) {
    console.error("Erreur envoi message:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'envoi du message",
    });
  }
};

const getConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const otherUserId = parseInt(req.params.otherUserId);

    if (isNaN(otherUserId)) {
      return res.status(400).json({
        success: false,
        message: "ID utilisateur invalide",
      });
    }

    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
        isDeleted: false,
      },
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["id", "userName", "userPhoto", "isOnline"],
        },
        {
          model: User,
          as: "receiver",
          attributes: ["id", "userName", "userPhoto"],
        },
        {
          model: Message,
          as: "replyTo",
          required: false,
          include: [
            {
              model: User,
              as: "sender",
              attributes: ["id", "userName", "userPhoto"],
            },
          ],
        },
      ],
      order: [["createdAt", "ASC"]],
    });

    res.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("Erreur récupération conversation:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;

    const message = await Message.findByPk(messageId, {
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["id", "userName", "userPhoto"],
        },
        {
          model: User,
          as: "receiver",
          attributes: ["id", "userName", "userPhoto"],
        },
      ],
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message non trouvé",
      });
    }

    if (message.senderId !== userId && message.receiverId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Non autorisé",
      });
    }

    await message.update({
      isDeleted: true,
      deletedById: userId,
      content: "Message supprimé",
    });

    if (global.io) {
      global.io
        .to(`user_${message.senderId}`)
        .emit("chat:message_deleted", { messageId });
      global.io
        .to(`user_${message.receiverId}`)
        .emit("chat:message_deleted", { messageId });
    }

    res.json({
      success: true,
      message: "Message supprimé avec succès",
    });
  } catch (error) {
    console.error("Erreur suppression message:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression",
    });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const unreadMessages = await Message.findAll({
      where: {
        receiverId: userId,
        isRead: false,
        isDeleted: false,
      },
      attributes: ["senderId"],
    });

    const counts = {};
    unreadMessages.forEach((msg) => {
      counts[msg.senderId] = (counts[msg.senderId] || 0) + 1;
    });

    res.json({
      success: true,
      counts,
      total: unreadMessages.length,
    });
  } catch (error) {
    console.error("Erreur unread count:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const senderId = parseInt(req.params.senderId);

    if (isNaN(senderId)) {
      return res.status(400).json({
        success: false,
        message: "senderId invalide",
      });
    }

    const [updatedCount] = await Message.update(
      {
        isRead: true,
        readAt: new Date(),
      },
      {
        where: {
          senderId,
          receiverId: userId,
          isRead: false,
        },
      },
    );

    if (global.io) {
      global.io
        .to(`user_${userId}`)
        .emit("chat:conversation_read", { senderId });
    }

    res.json({
      success: true,
      updated: updatedCount,
    });
  } catch (error) {
    console.error("Erreur markAsRead:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

const getMediaMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { friendId } = req.params;

    const medias = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId },
        ],
        messageType: { [Op.in]: ["image", "file"] },
        isDeleted: false,
      },
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      medias,
    });
  } catch (error) {
    console.error("Erreur récupération médias:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

const getLastConversationDate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { friendId } = req.params;

    if (!userId || !friendId) {
      return res.status(400).json({
        success: false,
        message: "Paramètres invalides",
      });
    }

    const lastMessage = await Message.findOne({
      where: {
        [Op.or]: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId },
        ],
        isDeleted: false,
      },
      order: [["createdAt", "DESC"]],
    });

    if (!lastMessage) {
      return res.json({
        success: true,
        formattedDate: null,
      });
    }

    const date = new Date(lastMessage.createdAt);

    res.json({
      success: true,
      formattedDate: {
        day: date.getDate(),
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        hours: date.getHours(),
        minutes: date.getMinutes(),
        seconds: date.getSeconds(),
      },
    });
  } catch (error) {
    console.error("Erreur getLastConversationDate:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

module.exports = {
  sendMessage,
  getConversation,
  deleteMessage,
  getUnreadCount,
  markAsRead,
  getMediaMessages,
  getLastConversationDate,
};
