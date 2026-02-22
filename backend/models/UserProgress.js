// models/UserProgress.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const UserProgress = sequelize.define("UserProgress", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  quizId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  // Score obtenu
  score: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  // Position dans le classement (pour multi)
  position: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  // Nombre total de questions
  totalQuestions: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  // Pourcentage de réussite
  percentage: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  // Type de quiz : 'classic', 'ia-solo', 'ia-multi'
  quizType: {
    type: DataTypes.ENUM("classic", "ia-solo", "ia-multi"),
    defaultValue: "ia-solo",
  },
  isGlobal: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  // Date de complétion
  completedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  // Pour les stats globales (optionnel)
  isGlobal: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  // Stats cumulées (pour la ligne globale)
  totalGames: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  totalScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  averageScore: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  bestScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
});

module.exports = UserProgress;
