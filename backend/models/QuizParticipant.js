const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const QuizParticipant = sequelize.define("QuizParticipant", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  quizId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  score: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  isReady: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  lastAnswerAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  joinedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

module.exports = QuizParticipant;
