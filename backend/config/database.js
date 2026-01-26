const { Sequelize } = require("sequelize");
require("dotenv").config();

//déclaration de variables
const DB_NAME = process.env.NAME;
const DB_USER = process.env.USER;
const DB_PASSWORD = process.env.PASSWORD;
const DB_HOST = process.env.HOST;
const DB_PORT = process.env.PORT;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  logging: false,
  dialect: "mysql",
});

sequelize
  .authenticate()
  .then(() => console.log("connexion à la base de données réussie"))
  .catch((error) => {
    console.log("erreur de connexion à la base de données", error);
  });

module.exports = sequelize;
