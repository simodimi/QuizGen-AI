const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Question = sequelize.define("Question", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  quizId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM("multiple", "qcm", "open"),
    allowNull: false,
    defaultValue: "qcm",
  },
  choices: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  correctAnswer: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  explanation: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  points: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  timeLimit: {
    type: DataTypes.INTEGER,
    defaultValue: 40,
  },
});

module.exports = Question;
