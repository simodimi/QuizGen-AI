const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Document = sequelize.define("Document", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  userId: { type: DataTypes.INTEGER, allowNull: false },

  fileName: { type: DataTypes.STRING, allowNull: false },

  mimeType: { type: DataTypes.STRING, allowNull: false }, //type de fichier

  size: { type: DataTypes.INTEGER, allowNull: false },

  path: { type: DataTypes.STRING, allowNull: false }, //chemin du fichier sur le serveur

  shared: { type: DataTypes.BOOLEAN, defaultValue: false },
  textPreview: {
    type: DataTypes.TEXT,
    allowNull: true,
  }, //extrait de texte pour l'aperçu
  sectionCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  }, //nombre de sections que contient le document
});
module.exports = Document;
