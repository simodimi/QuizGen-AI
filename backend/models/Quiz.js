const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Quiz = sequelize.define("Quiz", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "Nouveau Quiz",
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  creatorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  documentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  theme: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  difficulty: {
    type: DataTypes.ENUM("facile", "moyen", "difficile"),
    defaultValue: "moyen",
  },
  mode: {
    type: DataTypes.ENUM("solo", "multi"),
    defaultValue: "solo",
  },
  questionCount: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
  },
  timeLimit: {
    type: DataTypes.INTEGER,
    defaultValue: 40,
  },
  status: {
    type: DataTypes.ENUM("waiting", "running", "finished", "cancelled"),
    defaultValue: "waiting",
  },
  invitationCode: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true,
  },
  currentQuestionIndex: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  finishedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isGeneratedByAI: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isPredefined: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  maxParticipants: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
  },
});

module.exports = Quiz;
