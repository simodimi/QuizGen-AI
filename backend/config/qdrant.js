//configuration de qdrant base de données vectorielle
const { QdrantClient } = require("@qdrant/js-client-rest");
require("dotenv").config();
const VECTOR_COLLECTION = "document_sections"; //nom de la collection de stockage de vecteurs
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_Key,
});

module.exports = { qdrant, VECTOR_COLLECTION };
