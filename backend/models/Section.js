const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Section = sequelize.define("Section", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  documentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  wordCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
});

module.exports = Section;
