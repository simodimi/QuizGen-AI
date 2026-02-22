const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
const SharedDocument = sequelize.define("SharedDocument", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  documentId: { type: DataTypes.INTEGER, allowNull: false },
  ownerId: { type: DataTypes.INTEGER, allowNull: false }, // propriétaire original
  sharedWithId: { type: DataTypes.INTEGER, allowNull: false }, // utilisateur qui reçoit
  sharedViaQuizId: { type: DataTypes.INTEGER, allowNull: true }, // optionnel: via quel quiz
  sharedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});
module.exports = SharedDocument;
