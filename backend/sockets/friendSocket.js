const { Friend, User } = require("../models/Association");
const { Op } = require("sequelize");

module.exports = (io, socket) => {
  socket.on("join_friends_room", () => socket.join("friends_room"));
  socket.on("leave_friends_room", () => socket.leave("friends_room"));

  socket.on("join_user_room", (userId) => {
    if (!userId) return;
    socket.join(`user_${userId}`);
    console.log(`Utilisateur ${userId} rejoint room user_${userId}`);
  });
};
