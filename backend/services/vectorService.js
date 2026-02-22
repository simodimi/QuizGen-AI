// services/vectorService.js
const { qdrant, COLLECTION_NAME, getEmbedding } = require("../config/qdrant");
const { v4: uuidv4 } = require("uuid");

class VectorService {
  // Découper le texte en chunks intelligents
  static chunkText(text, maxChunkSize = 500) {
    const words = text.split(/\s+/);
    const chunks = [];

    for (let i = 0; i < words.length; i += maxChunkSize) {
      const chunkWords = words.slice(
        i,
        Math.min(i + maxChunkSize, words.length),
      );
      const content = chunkWords.join(" ");

      // Détecter si c'est un titre ou une section importante
      const firstLine = content.split("\n")[0];
      const isTitle = /^[A-Z][A-Z\s]{3,}$|^[IVXLCDM]+\.|^\d+\./.test(firstLine);

      chunks.push({
        id: uuidv4(),
        content,
        wordCount: chunkWords.length,
        startIndex: i,
        endIndex: Math.min(i + maxChunkSize, words.length),
        isTitle,
        title: isTitle ? firstLine : null,
        order: chunks.length + 1,
      });
    }

    return chunks;
  }

  // Indexer un document dans Qdrant
  // vectorService.js - AJOUTER des émissions socket
  static async indexDocument(documentId, text, metadata = {}) {
    try {
      const chunks = this.chunkText(text);
      const points = [];
      const io = global.io;
      const userId = metadata.userId;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await getEmbedding(chunk.content);

        points.push({
          id: chunk.id,
          vector: embedding,
          payload: {
            documentId,
            content: chunk.content,
            wordCount: chunk.wordCount,
            order: chunk.order,
            isTitle: chunk.isTitle,
            title: chunk.title,
            ...metadata,
            indexedAt: new Date().toISOString(),
          },
        });

        // Émettre la progression
        if (io && userId) {
          io.to(`user_${userId}`).emit("document:indexing_progress", {
            documentId,
            current: i + 1,
            total: chunks.length,
            percent: Math.round(((i + 1) / chunks.length) * 100),
          });
        }

        console.log(`📦 Chunk ${i + 1}/${chunks.length} vectorisé`);
      }

      // Insérer par lots
      for (let i = 0; i < points.length; i += 100) {
        const batch = points.slice(i, i + 100);
        await qdrant.upsert(COLLECTION_NAME, { points: batch });
      }

      // Notifier la fin
      if (io && userId) {
        io.to(`user_${userId}`).emit("document:indexed", {
          documentId,
          sectionCount: chunks.length,
        });
      }

      console.log(
        `✅ Document ${documentId} indexé avec ${chunks.length} chunks`,
      );
      return chunks.length;
    } catch (error) {
      console.error("❌ Erreur indexation document:", error);
      throw error;
    }
  }

  // Rechercher des chunks similaires
  static async searchSimilar(documentId, query, limit = 5) {
    try {
      const queryEmbedding = await getEmbedding(query);

      const results = await qdrant.search(COLLECTION_NAME, {
        vector: queryEmbedding,
        filter: {
          must: [
            {
              key: "documentId",
              match: { value: documentId },
            },
          ],
        },
        limit,
      });

      return results.map((r) => ({
        id: r.id,
        content: r.payload.content,
        score: r.score,
        order: r.payload.order,
      }));
    } catch (error) {
      console.error("❌ Erreur recherche:", error);
      return [];
    }
  }

  // Obtenir des chunks aléatoires pour varier les questions
  static async getRandomChunks(documentId, count = 5) {
    try {
      // Récupérer tous les chunks du document
      const results = await qdrant.scroll(COLLECTION_NAME, {
        filter: {
          must: [
            {
              key: "documentId",
              match: { value: documentId },
            },
          ],
        },
        limit: 1000,
      });

      const chunks = results.points.map((p) => ({
        id: p.id,
        content: p.payload.content,
        order: p.payload.order,
        wordCount: p.payload.wordCount,
      }));

      // Mélanger et prendre 'count' chunks
      const shuffled = chunks.sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    } catch (error) {
      console.error("❌ Erreur récupération chunks:", error);
      return [];
    }
  }

  // Supprimer un document de Qdrant
  static async deleteDocument(documentId) {
    try {
      await qdrant.delete(COLLECTION_NAME, {
        filter: {
          must: [
            {
              key: "documentId",
              match: { value: documentId },
            },
          ],
        },
      });
      console.log(`✅ Document ${documentId} supprimé de Qdrant`);
    } catch (error) {
      console.error("❌ Erreur suppression:", error);
    }
  }
}

module.exports = VectorService;
