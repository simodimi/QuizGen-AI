// services/ollamaService.js
const axios = require("axios");
require("dotenv").config();

const OLLAMA_URL = process.env.OLLAMA_URL;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL;

const ollamaService = {
  generate: async (prompt, options = {}) => {
    const { temperature = 0.3, max_tokens = 2000, signal } = options;

    try {
      console.log(`🚀 Envoi à Ollama (${OLLAMA_MODEL})...`);
      console.log(`📝 Prompt length: ${prompt.length} caractères`);

      const response = await axios({
        method: "post",
        url: `${OLLAMA_URL}/api/generate`,
        data: {
          model: OLLAMA_MODEL,
          prompt: prompt,
          stream: false,
          options: {
            temperature,
            num_predict: max_tokens,
            num_ctx: 1024, // Important pour les longs documents
          },
        },
        signal,
        timeout: 300000, // 5 minutes timeout pour les très longs documents
        headers: { "Content-Type": "application/json" },
      });

      console.log(
        `✅ Réponse reçue: ${response.data.response?.length || 0} caractères`,
      );
      return response.data.response;
    } catch (error) {
      console.error("❌ Erreur détaillée:");
      if (error.code === "ECONNABORTED") {
        console.error("Timeout dépassé");
      } else if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Data:", error.response.data);
      } else if (error.request) {
        console.error("Pas de réponse - Vérifiez qu'Ollama tourne");
      } else {
        console.error("Message:", error.message);
      }
      throw error;
    }
  },

  test: async () => {
    try {
      console.log("🔍 Test de connexion à Ollama...");

      // AUGMENTER LE TIMEOUT DU TEST À 30 SECONDES
      const response = await axios.get(`${OLLAMA_URL}/api/tags`, {
        timeout: 30000, // 30 secondes
      });

      const models = response.data.models || [];
      console.log("✅ Ollama répond sur le port 11434");
      console.log(
        "📦 Modèles disponibles:",
        models.map((m) => m.name).join(", "),
      );

      // Test de génération simple (avec timeout plus long)
      if (models.length > 0) {
        try {
          const testResponse = await axios.post(
            `${OLLAMA_URL}/api/generate`,
            {
              model: OLLAMA_MODEL,
              prompt: "Dis 'OK' en un mot",
              stream: false,
              options: { temperature: 0.3, num_predict: 10 },
            },
            { timeout: 30000 }, // 30 secondes
          );
          console.log(`✅ Test génération: "${testResponse.data.response}"`);
        } catch (genError) {
          console.log(
            `⚠️ Le modèle ${OLLAMA_MODEL} est en cours de chargement...`,
          );
        }
      }

      return {
        success: true,
        models: models.map((m) => m.name),
        message: "✅ Ollama fonctionne",
      };
    } catch (error) {
      console.error("❌ Test échoué:", error.message);
      return {
        success: false,
        error: error.message,
        suggestion: "Vérifiez qu'Ollama est lancé avec 'ollama serve'",
      };
    }
  },
};

module.exports = ollamaService;
