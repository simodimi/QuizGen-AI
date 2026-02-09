/*const { Message, User } = require("../models/Association");
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
};*/
const { Message, User } = require("../models/Association");
const { Op } = require("sequelize");

// Fonction pour émettre des événements Socket.IO
const emitMessageEvent = (eventName, userId, data) => {
  if (global.io) {
    global.io.to(`user_${userId}`).emit(eventName, data);
  }
};

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

    // Vérifier si l'utilisateur est ami avec le destinataire
    try {
      const Friend = require("../models/Friends");
      const isFriend = await Friend.findOne({
        where: {
          [Op.or]: [
            {
              requesterId: senderId,
              addresseeId: receiverId,
              status: "accepter", // Ton modèle utilise "accepter" pas "accepted"
            },
            {
              requesterId: receiverId,
              addresseeId: senderId,
              status: "accepter", // Ton modèle utilise "accepter" pas "accepted"
            },
          ],
        },
      });

      if (!isFriend) {
        return res.status(403).json({
          success: false,
          message: "Vous n'êtes pas ami avec cet utilisateur",
        });
      }
    } catch (error) {
      console.log("Erreur vérification amitié:", error);
    }

    const message = await Message.create({
      senderId,
      receiverId,
      content,
      messageType,
      replyToId,
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
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
          as: "addressee",
          attributes: ["id", "userName", "userPhoto", "isOnline"],
        },
      ],
    });

    // Mettre à jour le statut en ligne de l'expéditeur
    await User.update(
      { isOnline: true, last_login: new Date() },
      { where: { id: senderId } },
    );

    // Émettre l'événement au destinataire
    emitMessageEvent("chat:receive", receiverId, {
      ...messageWithRelations.toJSON(),
      event: "new_message",
      timestamp: Date.now(),
    });

    // Émettre l'événement à l'expéditeur
    emitMessageEvent("chat:sent", senderId, {
      ...messageWithRelations.toJSON(),
      event: "message_sent",
      status: "sent",
      timestamp: Date.now(),
    });

    // Compter les messages non lus pour le destinataire
    const unreadCount = await Message.count({
      where: {
        receiverId,
        senderId,
        isRead: false,
        isDeleted: false,
      },
    });

    // Émettre une notification de nouveau message
    emitMessageEvent("chat:notification", receiverId, {
      senderId,
      senderName: messageWithRelations.sender.userName,
      senderPhoto: messageWithRelations.sender.userPhoto,
      preview: content.length > 50 ? content.substring(0, 50) + "..." : content,
      unreadCount,
      messageId: message.id,
      timestamp: Date.now(),
    });

    // Notifier les autres sockets que la conversation a été mise à jour
    if (global.io) {
      global.io.to(`user_${senderId}`).emit("chat:conversation_updated", {
        friendId: receiverId,
        lastMessage: content,
        lastMessageTime: new Date(),
      });

      global.io.to(`user_${receiverId}`).emit("chat:conversation_updated", {
        friendId: senderId,
        lastMessage: content,
        lastMessageTime: new Date(),
      });
    }

    res.status(201).json({
      success: true,
      message: messageWithRelations,
      unreadCount,
    });
  } catch (error) {
    console.error("Erreur envoi message:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'envoi du message",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
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
          as: "addressee",
          attributes: ["id", "userName", "userPhoto", "isOnline"],
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

    // Marquer les messages comme lus si l'utilisateur actuel est le destinataire
    const unreadMessages = messages.filter(
      (msg) => msg.receiverId === userId && !msg.isRead,
    );

    if (unreadMessages.length > 0) {
      await Message.update(
        { isRead: true, readAt: new Date() },
        {
          where: {
            id: unreadMessages.map((msg) => msg.id),
            receiverId: userId,
            isRead: false,
          },
        },
      );

      // Émettre un événement pour indiquer que les messages ont été lus
      if (global.io) {
        global.io.to(`user_${otherUserId}`).emit("chat:messages_read", {
          readerId: userId,
          messageIds: unreadMessages.map((msg) => msg.id),
        });
      }
    }

    res.json({
      success: true,
      messages,
      total: messages.length,
      unreadCount: unreadMessages.length,
    });
  } catch (error) {
    console.error("Erreur récupération conversation:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
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
          as: "addressee",
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
      updatedAt: new Date(),
    });

    // Émettre l'événement de suppression aux deux utilisateurs
    if (global.io) {
      const emitData = {
        messageId: message.id,
        deletedBy: userId,
        timestamp: Date.now(),
      };

      emitMessageEvent("chat:message_deleted", message.senderId, emitData);
      emitMessageEvent("chat:message_deleted", message.receiverId, emitData);
    }

    res.json({
      success: true,
      message: "Message supprimé avec succès",
      deletedAt: new Date(),
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
      group: ["senderId"],
    });

    const counts = {};
    for (const msg of unreadMessages) {
      const count = await Message.count({
        where: {
          senderId: msg.senderId,
          receiverId: userId,
          isRead: false,
          isDeleted: false,
        },
      });
      counts[msg.senderId] = count;
    }

    // Récupérer les informations des expéditeurs
    const sendersInfo = await User.findAll({
      where: {
        id: Object.keys(counts).map((id) => parseInt(id)),
      },
      attributes: ["id", "userName", "userPhoto", "isOnline"],
    });

    const detailedCounts = sendersInfo.map((sender) => ({
      userId: sender.id,
      userName: sender.userName,
      userPhoto: sender.userPhoto,
      isOnline: sender.isOnline,
      unreadCount: counts[sender.id] || 0,
    }));

    res.json({
      success: true,
      counts: detailedCounts,
      total: Object.values(counts).reduce((sum, count) => sum + count, 0),
    });
  } catch (error) {
    console.error("Erreur unread count:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
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
          isDeleted: false,
        },
      },
    );

    // Récupérer les IDs des messages marqués comme lus
    const readMessages = await Message.findAll({
      where: {
        senderId,
        receiverId: userId,
        isRead: true,
        readAt: { [Op.ne]: null },
        updatedAt: { [Op.gte]: new Date(Date.now() - 10000) }, // Messages mis à jour il y a moins de 10 secondes
      },
      attributes: ["id"],
      limit: 10,
    });

    if (global.io) {
      // Informer l'expéditeur que ses messages ont été lus
      global.io.to(`user_${senderId}`).emit("chat:conversation_read", {
        readerId: userId,
        messageIds: readMessages.map((msg) => msg.id),
        readAt: new Date(),
      });

      // Informer le lecteur
      global.io.to(`user_${userId}`).emit("chat:messages_marked_read", {
        senderId,
        count: updatedCount,
      });
    }

    res.json({
      success: true,
      updated: updatedCount,
      readMessages: readMessages.map((msg) => msg.id),
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
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["id", "userName", "userPhoto"],
        },
      ],
    });

    res.json({
      success: true,
      medias,
      total: medias.length,
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
        lastMessage: null,
      });
    }

    const date = new Date(lastMessage.createdAt);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    let timeAgo = "";
    if (diffMins < 1) {
      timeAgo = "À l'instant";
    } else if (diffMins < 60) {
      timeAgo = `Il y a ${diffMins} min`;
    } else if (diffHours < 24) {
      timeAgo = `Il y a ${diffHours} h`;
    } else if (diffDays < 7) {
      timeAgo = `Il y a ${diffDays} j`;
    } else {
      timeAgo = date.toLocaleDateString();
    }

    res.json({
      success: true,
      formattedDate: {
        day: date.getDate(),
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        hours: date.getHours(),
        minutes: date.getMinutes(),
        seconds: date.getSeconds(),
        fullDate: date.toISOString(),
        timeAgo,
      },
      lastMessage: {
        id: lastMessage.id,
        content: lastMessage.content,
        senderId: lastMessage.senderId,
        messageType: lastMessage.messageType,
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

// Configuration des handlers Socket.IO pour les messages
const setupMessageSocketHandlers = (io) => {
  console.log("Initialisation des handlers Socket.IO pour les messages...");

  io.on("connection", (socket) => {
    console.log(`Nouveau socket connecté pour messages: ${socket.id}`);

    const userId = socket.handshake.query.userId;
    console.log(`Socket ${socket.id} associé à l'utilisateur: ${userId}`);

    // Rejoindre la room utilisateur
    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`Socket ${socket.id} rejoint user_${userId}`);

      // Notifier que l'utilisateur est en ligne pour les messages
      socket.broadcast.emit("user:online", parseInt(userId));
    }

    // Indicateur de frappe
    socket.on("typing:start", (data) => {
      console.log("typing:start reçu:", data);
      const { userId, receiverId } = data;

      if (userId && receiverId) {
        io.to(`user_${receiverId}`).emit("typing:status", {
          userId: parseInt(userId),
          isTyping: true,
          timestamp: Date.now(),
        });
        console.log(`Utilisateur ${userId} tape à ${receiverId}`);
      }
    });

    socket.on("typing:stop", (data) => {
      console.log("typing:stop reçu:", data);
      const { userId, receiverId } = data;

      if (userId && receiverId) {
        io.to(`user_${receiverId}`).emit("typing:status", {
          userId: parseInt(userId),
          isTyping: false,
          timestamp: Date.now(),
        });
        console.log(`Utilisateur ${userId} a arrêté de taper à ${receiverId}`);
      }
    });

    // Message envoyé
    socket.on("message:sent", (data) => {
      console.log("message:sent reçu:", data);
      const { messageId, receiverId } = data;

      if (messageId && receiverId) {
        io.to(`user_${receiverId}`).emit("message:status", {
          messageId,
          status: "sent",
          timestamp: Date.now(),
        });
      }
    });

    // Message délivré
    socket.on("message:delivered", (data) => {
      console.log("message:delivered reçu:", data);
      const { messageId, receiverId } = data;

      if (messageId && receiverId) {
        io.to(`user_${receiverId}`).emit("message:status", {
          messageId,
          status: "delivered",
          timestamp: Date.now(),
        });
      }
    });

    // Conversation lue
    socket.on("chat:conversation_read", (data) => {
      console.log("chat:conversation_read reçu:", data);
      const { senderId } = data;

      if (userId && senderId) {
        io.to(`user_${senderId}`).emit("chat:messages_read", {
          readerId: parseInt(userId),
          senderId: parseInt(senderId),
          timestamp: Date.now(),
        });
      }
    });

    // Ping/pong pour maintenir la connexion
    socket.on("ping", () => {
      socket.emit("pong", { timestamp: Date.now() });
    });

    // Déconnexion
    socket.on("disconnect", (reason) => {
      console.log(`Socket ${socket.id} déconnecté. Raison: ${reason}`);

      if (userId) {
        // Notifier que l'utilisateur est hors ligne
        socket.broadcast.emit("user:offline", parseInt(userId));
        console.log(`Utilisateur ${userId} est maintenant hors ligne`);
      }
    });

    // Gestion des erreurs
    socket.on("error", (error) => {
      console.error(`Erreur sur le socket ${socket.id}:`, error);
    });
  });

  console.log("Handlers Socket.IO pour les messages initialisés avec succès");
};

module.exports = {
  sendMessage,
  getConversation,
  deleteMessage,
  getUnreadCount,
  markAsRead,
  getMediaMessages,
  getLastConversationDate,
  setupMessageSocketHandlers,
};
