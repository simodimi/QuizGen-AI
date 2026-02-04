const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Friend = sequelize.define(
  "Friend",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    requesterId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    receiverId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("attente", "accepter", "refuser"),
      defaultValue: "attente",
    },
    acceptedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rejectedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    indexes: [
      //empêcher les amis doublons
      {
        unique: true,
        fields: ["requesterId", "receiverId"],
      },
    ],
  },
);

module.exports = Friend;
