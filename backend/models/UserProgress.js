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
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
});

module.exports = UserProgress;
