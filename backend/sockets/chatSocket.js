const { Message, Friend, User } = require("../models/Association");
const { Op } = require("sequelize");

module.exports = (io, socket) => {
  // Envoyer un message
  socket.on(
    "chat:send",
    async ({ toUserId, content, messageType = "text", replyToId = null }) => {
      try {
        // Vérifier amitié acceptée
        const friendship = await Friend.findOne({
          where: {
            status: "accepter",
            [Op.or]: [
              { requesterId: socket.userId, receiverId: toUserId },
              { requesterId: toUserId, receiverId: socket.userId },
            ],
          },
        });

        if (!friendship) {
          socket.emit("chat:send_error", {
            message: "Vous ne pouvez envoyer des messages qu'à vos amis",
          });
          return;
        }

        // Créer le message
        const message = await Message.create({
          senderId: socket.userId,
          receiverId: toUserId,
          content,
          messageType,
          replyToId,
          isRead: false,
        });

        // Récupérer le message complet avec l'expéditeur
        const messageWithSender = await Message.findByPk(message.id, {
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

        // Émettre au destinataire
        io.to(`user_${toUserId}`).emit("chat:receive", messageWithSender);

        // Émettre à l'expéditeur (confirmation)
        socket.emit("chat:sent", {
          ...messageWithSender.toJSON(),
          status: "sent",
          sentAt: new Date(),
        });

        // Mettre à jour le dernier message dans la conversation
        io.to(`user_${socket.userId}`).emit("chat:conversation_updated", {
          userId: toUserId,
          lastMessage: messageWithSender,
        });

        io.to(`user_${toUserId}`).emit("chat:conversation_updated", {
          userId: socket.userId,
          lastMessage: messageWithSender,
        });
      } catch (error) {
        console.error("Erreur chat:send:", error);
        socket.emit("chat:send_error", {
          message: "Erreur lors de l'envoi du message",
        });
      }
    },
  );

  // Marquer un message comme lu
  socket.on("chat:read", async ({ messageId }) => {
    try {
      const message = await Message.findByPk(messageId, {
        include: [
          {
            model: User,
            as: "sender",
            attributes: ["id", "userName"],
          },
        ],
      });

      if (!message) {
        socket.emit("chat:read_error", {
          messageId,
          error: "Message non trouvé",
        });
        return;
      }

      // Vérifier que l'utilisateur est le destinataire
      if (message.receiverId !== socket.userId) {
        socket.emit("chat:read_error", { messageId, error: "Non autorisé" });
        return;
      }

      // Mettre à jour le message
      await message.update({
        isRead: true,
        readAt: new Date(),
      });

      // Informer l'expéditeur que son message a été lu
      io.to(`user_${message.senderId}`).emit("chat:read_receipt", {
        messageId,
        readBy: socket.userId,
        readAt: message.readAt,
      });

      socket.emit("chat:read_success", { messageId });
    } catch (error) {
      console.error("Erreur chat:read:", error);
      socket.emit("chat:read_error", { messageId, error: "Erreur serveur" });
    }
  });

  // Marquer tous les messages d'une conversation comme lus
  socket.on("chat:read_conversation", async ({ otherUserId }) => {
    try {
      await Message.update(
        {
          isRead: true,
          readAt: new Date(),
        },
        {
          where: {
            senderId: otherUserId,
            receiverId: socket.userId,
            isRead: false,
          },
        },
      );

      // Informer l'autre utilisateur
      io.to(`user_${otherUserId}`).emit("chat:conversation_read", {
        readBy: socket.userId,
        readAt: new Date(),
      });

      socket.emit("chat:conversation_read_success", { otherUserId });
    } catch (error) {
      console.error("Erreur chat:read_conversation:", error);
      socket.emit("chat:conversation_read_error", {
        otherUserId,
        error: "Erreur serveur",
      });
    }
  });

  // Typing indicator (en train d'écrire)
  socket.on("chat:typing", ({ toUserId, isTyping }) => {
    io.to(`user_${toUserId}`).emit("chat:typing_indicator", {
      fromUserId: socket.userId,
      isTyping,
    });
  });

  // Rejoindre une conversation
  socket.on("chat:join_conversation", ({ conversationId }) => {
    socket.join(`conversation_${conversationId}`);
  });

  // Quitter une conversation
  socket.on("chat:leave_conversation", ({ conversationId }) => {
    socket.leave(`conversation_${conversationId}`);
  });

  // Supprimer un message
  socket.on("chat:delete", async ({ messageId }) => {
    try {
      const message = await Message.findByPk(messageId);

      if (!message) {
        socket.emit("chat:delete_error", {
          messageId,
          error: "Message non trouvé",
        });
        return;
      }

      // Vérifier les droits (expéditeur ou destinataire)
      if (
        message.senderId !== socket.userId &&
        message.receiverId !== socket.userId
      ) {
        socket.emit("chat:delete_error", { messageId, error: "Non autorisé" });
        return;
      }

      // Marquer comme supprimé
      await message.update({
        isDeleted: true,
        deletedById: socket.userId,
        content: "Message supprimé",
      });

      // Informer les deux parties
      io.to(`user_${message.senderId}`).emit("chat:message_deleted", {
        messageId,
      });
      io.to(`user_${message.receiverId}`).emit("chat:message_deleted", {
        messageId,
      });

      socket.emit("chat:delete_success", { messageId });
    } catch (error) {
      console.error("Erreur chat:delete:", error);
      socket.emit("chat:delete_error", { messageId, error: "Erreur serveur" });
    }
  });

  // Vérifier la connexion d'un ami
  socket.on("chat:check_online", async ({ friendId }) => {
    try {
      const friend = await User.findByPk(friendId, {
        attributes: ["id", "userName", "isOnline", "last_login"],
      });

      if (friend) {
        socket.emit("chat:friend_status", {
          friendId,
          isOnline: friend.isOnline,
          lastSeen: friend.last_login,
        });
      }
    } catch (error) {
      console.error("Erreur chat:check_online:", error);
    }
  });

  // Initialisation : rejoindre la room de l'utilisateur
  socket.on("chat:init", () => {
    socket.join(`user_${socket.userId}`);
    console.log(`Chat initialisé pour user_${socket.userId}`);
  });
};
