const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const User = sequelize.define("User", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: "iduser",
  },
  userName: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  userEmail: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  userPassword: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  userPhoto: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: "/public/default-avatar.png",
  },
  date_inscription: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  statut: {
    type: DataTypes.ENUM("En ligne", "Hors ligne"),
    defaultValue: "Hors ligne",
  },
  background_image: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  validationToken: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isOnline: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

module.exports = User;
