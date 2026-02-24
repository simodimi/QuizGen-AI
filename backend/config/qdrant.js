const { QdrantClient } = require("@qdrant/js-client-rest");
require("dotenv").config();

const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const COLLECTION_NAME = "document_sections";

const qdrant = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
});
const createDocumentIdIndex = async () => {
  try {
    await qdrant.createPayloadIndex(COLLECTION_NAME, {
      field_name: "documentId",
      field_schema: "integer",
      wait: true,
    });
    console.log("✅ Index sur documentId créé avec succès");
  } catch (error) {
    // Si l'index existe déjà, Qdrant renvoie une erreur, on ignore
    if (
      error.status === 400 &&
      error.data?.status?.error?.includes("already exists")
    ) {
      console.log("ℹ️ L'index sur documentId existe déjà");
    } else {
      console.error("❌ Erreur création index:", error.message);
    }
  }
};
// Fonction pour créer la collection si elle n'existe pas
const initializeCollection = async () => {
  try {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some(
      (col) => col.name === COLLECTION_NAME,
    );

    if (!exists) {
      await qdrant.createCollection(COLLECTION_NAME, {
        vectors: {
          size: 768, // Taille de l'embedding (ex: 768 pour certains modèles)
          distance: "Cosine",
        },
      });
      console.log("✅ Collection Qdrant créée avec succès");
      // Créer l'index sur documentId après la création de la collection
      await createDocumentIdIndex();
    } else {
      console.log("📦 Collection Qdrant existe déjà");
    }
  } catch (error) {
    console.error("❌ Erreur initialisation Qdrant:", error.message);
  }
};

// Fonction pour obtenir un modèle d'embedding (simulé pour l'instant)
const getEmbedding = async (text) => {
  try {
    // Version simplifiée - on utilisera Ollama pour les embeddings
    const axios = require("axios");
    const response = await axios.post(
      `${process.env.OLLAMA_URL}/api/embeddings`,
      {
        model: "nomic-embed-text", // Modèle pour embeddings
        prompt: text.substring(0, 1000),
      },
    );
    return response.data.embedding;
  } catch (error) {
    console.error("Erreur embedding:", error);
    // Fallback: vecteur aléatoire (ne pas utiliser en production)
    return Array(384)
      .fill(0)
      .map(() => Math.random() * 2 - 1);
  }
};
const countDocumentPoints = async (documentId) => {
  try {
    const result = await qdrant.count(COLLECTION_NAME, {
      filter: {
        must: [{ key: "documentId", match: { value: documentId } }],
      },
    });
    return result.count;
  } catch (error) {
    console.error("❌ Erreur comptage points:", error.message);
    return 0;
  }
};
module.exports = {
  qdrant,
  COLLECTION_NAME,
  initializeCollection,
  getEmbedding,
  createDocumentIdIndex,
  countDocumentPoints,
};
