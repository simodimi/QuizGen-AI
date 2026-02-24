// services/iaQuizService.js - VERSION FINALE CORRIGÉE
const ollamaService = require("../config/ollama");
const VectorService = require("./vectorService");

// Détection de la langue (gardée pour compatibilité)
const detectLanguage = (text) => {
  const frenchIndicators = [
    "le ",
    "la ",
    "les ",
    "un ",
    "une ",
    "des ",
    "est ",
    "sont ",
    "dans ",
    "pour ",
    "avec ",
    "qui ",
    "que ",
    "dont ",
    "où ",
    "comment ",
  ];

  const sample = text.toLowerCase().substring(0, 2000);
  let frenchScore = 0;

  frenchIndicators.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "g");
    const matches = sample.match(regex);
    if (matches) frenchScore += matches.length * 2;
  });

  const accentCount = (sample.match(/[éèêëàâäîïôûùüç]/g) || []).length;
  frenchScore += accentCount * 3;

  return frenchScore > 20 ? "fr" : "en";
};

// PROMPT AMÉLIORÉ
const buildImprovedPrompt = (chunk, index, total) => {
  return `Tu es un expert en création de QCM. Génère UNE question de qualité basée STRICTEMENT sur ce passage.

PASSAGE:
"""
${chunk.content.substring(0, 800)}
"""

CONTRAINTES ABSOLUES:
1. La question doit être COMPLÈTE et se terminer par "?"
2. Les 4 choix doivent être des PHRASES COMPLÈTES
3. La bonne réponse doit être TEXTUELLEMENT dans le passage
4. Les mauvaises réponses doivent être FAUSSES mais PLAUSIBLES
5. L'explication doit CITER le passage
6. Réponds UNIQUEMENT avec le JSON, RIEN d'autre

FORMAT JSON STRICT:
{
  "text": "Question complète basée sur le passage?",
  "choices": [
    "Premier choix - une phrase complète",
    "Deuxième choix - une phrase complète", 
    "Troisième choix - une phrase complète",
    "Quatrième choix - une phrase complète"
  ],
  "correctAnswer": "Premier choix - une phrase complète",
  "explanation": "D'après le passage : '[citation exacte]'"
}

JSON:`;
};

const extractJSON = (text) => {
  try {
    // ÉTAPE 1: Nettoyage de base
    let cleaned = text
      .replace(/```json\n?/gi, "")
      .replace(/```\n?/gi, "")
      .replace(/\\n/g, " ")
      .replace(/\n/g, " ")
      .replace(/\r/g, " ")
      .replace(/\t/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // ÉTAPE 2: CORRECTION POUR LA QUESTION 2 - Gérer les guillemets français « »
    cleaned = cleaned.replace(/«/g, '\\"').replace(/»/g, '\\"');

    // ÉTAPE 3: Échapper tous les guillemets doubles qui ne sont pas déjà échappés
    cleaned = cleaned.replace(/(?<!\\)"(?![,\}\]])/g, '\\"');

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start === -1 || end === -1) {
      console.log("❌ Pas de JSON trouvé");
      return null;
    }

    let jsonStr = cleaned.substring(start, end + 1);

    // ÉTAPE 4: CORRECTION POUR LA QUESTION 4 - Compléter les JSON tronqués
    if (
      jsonStr.includes('"correctAnswer"') &&
      !jsonStr.includes('"correctAnswer":"')
    ) {
      // Ajouter une valeur par défaut
      jsonStr = jsonStr.replace(
        /"correctAnswer"/,
        '"correctAnswer":"Option 1"',
      );
    }

    // Vérifier s'il manque des virgules entre les propriétés
    jsonStr = jsonStr.replace(/}\s*{/g, "},{");

    // Réparer les virgules en trop
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, "$1");

    // ÉTAPE 5: Tentative de parsing
    try {
      const parsed = JSON.parse(jsonStr);

      // Validation et correction
      if (!parsed.choices || !Array.isArray(parsed.choices)) {
        parsed.choices = [];
      }

      // Nettoyer les choix
      parsed.choices = parsed.choices
        .map((c) => c.replace(/^\d+\.\s*/, "").trim())
        .filter((c) => c.length > 0);

      // S'assurer d'avoir 4 choix
      while (parsed.choices.length < 4) {
        parsed.choices.push(`Option ${parsed.choices.length + 1}`);
      }

      if (parsed.choices.length > 4) {
        parsed.choices = parsed.choices.slice(0, 4);
      }

      // Vérifier que correctAnswer est dans les choix
      if (
        parsed.correctAnswer &&
        !parsed.choices.includes(parsed.correctAnswer)
      ) {
        parsed.choices[Math.floor(Math.random() * 4)] = parsed.correctAnswer;
      }

      return parsed;
    } catch (parseError) {
      console.log("⚠️ Premier parsing échoué, tentative de récupération...");

      // ÉTAPE 6: RÉCUPÉRATION MANUELLE POUR LES CAS COMPLEXES
      return manualJSONRecovery(text);
    }
  } catch (e) {
    console.log("❌ Erreur critique extractJSON:", e.message);
    return manualJSONRecovery(text);
  }
};

// Fonction de récupération manuelle pour les cas désespérés
const manualJSONRecovery = (text) => {
  try {
    console.log("🛠️ Tentative de récupération manuelle...");

    // 1. Trouver le bloc JSON dans la réponse
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const jsonText = jsonMatch[0];
    const lines = jsonText.split("\n");

    let result = {
      text: "",
      choices: [],
      correctAnswer: "",
      explanation: "",
    };

    let inChoices = false;
    let currentChoice = "";

    for (const line of lines) {
      const trimmed = line.trim();

      // Extraire le texte de la question
      if (trimmed.includes('"text"')) {
        const match = trimmed.match(/"text"\s*:\s*"([^"]+)"/);
        if (match) {
          result.text = match[1];
        } else {
          // Fallback: prendre tout après :
          const fallback = trimmed.split(":")[1]?.replace(/["',]/g, "").trim();
          if (fallback) result.text = fallback;
        }
      }

      // Capturer les choix - PRIORITÉ AUX TEXTES RÉELS
      if (trimmed.includes('"choices"')) {
        inChoices = true;
        continue;
      }

      if (inChoices) {
        // Pattern pour capturer le texte entre guillemets (priorité 1)
        const quoteMatch = trimmed.match(/"([^"]+)"/);
        if (quoteMatch) {
          const choice = quoteMatch[1].trim();
          if (choice && !choice.includes("correctAnswer")) {
            result.choices.push(choice);
          }
        }
        // Pattern pour capturer le texte après une virgule (priorité 2)
        else if (trimmed.match(/^[^\[\],]+/) && !trimmed.includes("]")) {
          const choice = trimmed.replace(/,$/, "").trim();
          if (choice && !choice.startsWith('"correctAnswer"')) {
            // Nettoyer les guillemets résiduels
            const cleanChoice = choice.replace(/^["']|["']$/g, "");
            if (cleanChoice && !result.choices.includes(cleanChoice)) {
              result.choices.push(cleanChoice);
            }
          }
        }

        // Fin du tableau
        if (trimmed.includes("]")) {
          inChoices = false;
        }
      }

      // Extraire la bonne réponse
      if (trimmed.includes('"correctAnswer"')) {
        const match = trimmed.match(/"correctAnswer"\s*:\s*"([^"]+)"/);
        if (match) {
          result.correctAnswer = match[1];
        } else {
          const fallback = trimmed.split(":")[1]?.replace(/["',]/g, "").trim();
          if (fallback) result.correctAnswer = fallback;
        }
      }

      // Extraire l'explication
      if (trimmed.includes('"explanation"')) {
        const match = trimmed.match(/"explanation"\s*:\s*"([^"]+)"/);
        if (match) {
          result.explanation = match[1];
        } else {
          const fallback = trimmed.split(":")[1]?.replace(/["',]/g, "").trim();
          if (fallback) result.explanation = fallback;
        }
      }
    }

    // Si on a des choix, on les garde, on ne crée PAS de "Option X"
    if (result.choices.length > 0) {
      console.log("✅ Choix récupérés:", result.choices);
    } else {
      // Dernier recours : chercher des phrases dans le texte
      const sentences = text.match(/[^.!?]+[.!?]/g) || [];
      result.choices = sentences.slice(1, 5).map((s) => s.trim());
    }

    // S'assurer d'avoir 4 choix, mais SANS perdre les textes réels
    if (result.choices.length > 4) {
      result.choices = result.choices.slice(0, 4);
    }

    // Compléter avec les textes qu'on a, pas avec des "Option X"
    while (result.choices.length < 4) {
      result.choices.push(`Option complémentaire ${result.choices.length + 1}`);
    }

    console.log("✅ Récupération réussie");
    return result;
  } catch (e) {
    console.log("❌ Erreur:", e.message);
    return null;
  }
};
// VALIDATION FLEXIBLE
const validateQuestion = (q) => {
  // Vérifier les champs obligatoires
  if (!q || !q.text || q.text.length < 5) return false;

  // Vérifier les choix
  if (!q.choices || !Array.isArray(q.choices) || q.choices.length < 2)
    return false;

  // S'assurer qu'on a au moins 2 choix (minimum pour un QCM)
  // et compléter si nécessaire
  while (q.choices.length < 4) {
    q.choices.push(`Option ${q.choices.length + 1}`);
  }

  // Vérifier la bonne réponse
  if (!q.correctAnswer) return false;

  // Si la bonne réponse n'est pas dans les choix, l'ajouter
  if (!q.choices.includes(q.correctAnswer)) {
    q.choices[Math.floor(Math.random() * 4)] = q.correctAnswer;
  }

  // Explication optionnelle mais recommandée
  if (!q.explanation) {
    q.explanation = "Basé sur le contenu du document.";
  }

  return true;
};

// GÉNÉRATION D'UNE QUESTION
const generateSingleQuestion = async (chunk, index, total) => {
  try {
    const prompt = buildImprovedPrompt(chunk, index, total);

    const response = await ollamaService.generate(prompt, {
      temperature: 0.3 + Math.random() * 0.2,
      max_tokens: 1200,
    });

    let questionData = extractJSON(response);

    // NORMALISATION DES DONNÉES
    if (questionData) {
      // S'assurer que choices est un tableau
      if (!Array.isArray(questionData.choices)) {
        questionData.choices = [];
      }

      // Supprimer les doublons dans les choix
      questionData.choices = [...new Set(questionData.choices)];

      // Si moins de 4 choix, en ajouter
      while (questionData.choices.length < 4) {
        questionData.choices.push(`Option ${questionData.choices.length + 1}`);
      }

      // Si plus de 4 choix, en prendre 4 aléatoirement
      if (questionData.choices.length > 4) {
        // Garder la bonne réponse si elle est dans les choix
        const hasCorrect = questionData.choices.includes(
          questionData.correctAnswer,
        );
        questionData.choices = questionData.choices.slice(0, 4);
        if (
          hasCorrect &&
          !questionData.choices.includes(questionData.correctAnswer)
        ) {
          questionData.choices[3] = questionData.correctAnswer;
        }
      }
    }

    if (!questionData || !validateQuestion(questionData)) {
      console.log(`⚠️ Question ${index + 1} invalide, fallback`);
      return generateFallbackQuestion(chunk, index + 1);
    }

    return {
      id: index + 1,
      text: questionData.text,
      type: "qcm",
      choices: questionData.choices,
      correctAnswer: questionData.correctAnswer,
      explanation:
        questionData.explanation || "Basé sur le contenu du document.",
      points: 1,
      timeLimit: 40,
      order: index + 1,
      sourceChunk: chunk.order,
    };
  } catch (error) {
    console.log(`⚠️ Échec question ${index + 1}, fallback...`);
    return generateFallbackQuestion(chunk, index + 1);
  }
};

// FALLBACK POUR UNE QUESTION
const generateFallbackQuestion = (chunk, order) => {
  const sentences = chunk.content
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30 && s.length < 200);

  if (sentences.length > 0) {
    const sentence = sentences[0];
    const words = sentence.split(" ");
    const keyWord = words.find((w) => w.length > 5) || words[0] || "concept";

    return {
      id: order,
      text: `Que dit le texte à propos de "${keyWord}" ?`,
      type: "qcm",
      choices: [
        sentence.substring(0, 60) + "...",
        `Le texte ne parle pas de ${keyWord}.`,
        `${keyWord} n'est pas mentionné.`,
        `Information incorrecte sur ${keyWord}.`,
      ].sort(() => Math.random() - 0.5),
      correctAnswer: sentence.substring(0, 60) + "...",
      explanation: `D'après le passage : "${sentence.substring(0, 100)}..."`,
      points: 1,
      timeLimit: 40,
      order,
      sourceChunk: chunk.order,
    };
  }

  return {
    id: order,
    text: `Question ${order} sur le document`,
    type: "qcm",
    choices: ["Option A", "Option B", "Option C", "Option D"],
    correctAnswer: "Option A",
    explanation: "Basé sur le contenu du document.",
    points: 1,
    timeLimit: 40,
    order,
    sourceChunk: chunk.order,
  };
};

// FONCTION PRINCIPALE
const generateQuizFromText = async (text, options = {}) => {
  const {
    documentId,
    questionCount = 4,
    difficulty = "medium",
    documentType = "general",
    onProgress = () => {},
  } = options;

  try {
    onProgress({ step: 1, message: "🧹 Préparation...", progress: 10 });

    if (!text || text.length < 100) {
      throw new Error("Texte trop court");
    }

    let chunks = [];

    // ÉTAPE 1: Essayer Qdrant avec attente intelligente
    if (documentId) {
      onProgress({
        step: 2,
        message: "🔍 Vérification de l'indexation Qdrant...",
        progress: 20,
      });

      let qdrantReady = false;
      for (let i = 0; i < 5; i++) {
        try {
          const VectorService = require("./vectorService");
          const isIndexed =
            await VectorService.checkDocumentIndexed(documentId);

          if (isIndexed) {
            qdrantReady = true;
            console.log(
              `✅ Document ${documentId} trouvé dans Qdrant après ${i + 1}s`,
            );
            break;
          }
        } catch (e) {}

        if (i < 4) {
          onProgress({
            step: 2,
            message: `⏳ Attente indexation Qdrant... (${i + 1}/5)`,
            progress: 20 + i * 3,
          });
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (qdrantReady) {
        onProgress({
          step: 3,
          message: "🔍 Recherche dans Qdrant...",
          progress: 35,
        });

        try {
          const VectorService = require("./vectorService");
          chunks = await VectorService.getRandomChunks(
            documentId,
            questionCount,
          );

          if (chunks && chunks.length > 0) {
            console.log(`✅ ${chunks.length} passages récupérés de Qdrant`);
            onProgress({
              step: 4,
              message: `📚 ${chunks.length} passages trouvés dans Qdrant`,
              progress: 40,
            });
          }
        } catch (qdrantError) {
          console.log("⚠️ Erreur Qdrant:", qdrantError.message);
        }
      } else {
        console.log(`⏱️ Timeout attente Qdrant pour document ${documentId}`);
      }
    }

    // ÉTAPE 2: Fallback sur PostgreSQL
    if (!chunks || chunks.length === 0) {
      onProgress({
        step: 3,
        message: "🔍 Utilisation des sections en base de données...",
        progress: 40,
      });

      try {
        const { Section } = require("../models/Association");
        const sections = await Section.findAll({
          where: { documentId },
          order: [["order", "ASC"]],
          limit: questionCount,
        });

        if (sections && sections.length > 0) {
          chunks = sections.map((section) => ({
            content: section.content,
            order: section.order,
            wordCount: section.wordCount,
          }));
          console.log(`✅ ${chunks.length} sections récupérées de PostgreSQL`);
          onProgress({
            step: 4,
            message: `📚 ${chunks.length} sections trouvées en base`,
            progress: 45,
          });
        }
      } catch (dbError) {
        console.log("⚠️ Erreur DB:", dbError.message);
      }
    }

    // ÉTAPE 3: Fallback ultime
    if (!chunks || chunks.length === 0) {
      onProgress({
        step: 3,
        message: "📄 Découpage du document...",
        progress: 40,
      });

      const VectorService = require("./vectorService");
      const tempChunks = VectorService.chunkText(text, 500);
      chunks = tempChunks.slice(0, questionCount).map((chunk) => ({
        content: chunk.content,
        order: chunk.order,
        wordCount: chunk.wordCount,
      }));

      console.log(
        `⚠️ Mode dégradé: ${chunks.length} chunks générés à la volée`,
      );
      onProgress({
        step: 4,
        message: `📚 ${chunks.length} passages extraits`,
        progress: 45,
      });
    }

    if (!chunks || chunks.length === 0) {
      throw new Error("Aucun passage disponible");
    }

    onProgress({
      step: 5,
      message: `🤖 Génération de ${chunks.length} questions...`,
      progress: 50,
    });

    // Générer les questions
    const questions = [];
    const batchSize = 3;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const batchPromises = batch.map((chunk, idx) =>
        generateSingleQuestion(chunk, i + idx, chunks.length),
      );

      const batchResults = await Promise.all(batchPromises);
      questions.push(...batchResults);

      onProgress({
        step: 6,
        message: `✅ ${questions.length}/${chunks.length} questions générées`,
        progress: 50 + (questions.length / chunks.length) * 40,
      });
    }

    questions.sort((a, b) => a.order - b.order);

    let title = `Quiz ${documentType}`;
    if (chunks[0] && chunks[0].content) {
      const firstLine = chunks[0].content.split("\n")[0];
      if (firstLine && firstLine.length < 100) {
        title = `Quiz: ${firstLine.substring(0, 50)}...`;
      }
    }

    onProgress({ step: 7, message: `✅ Quiz prêt`, progress: 100 });

    return {
      title,
      documentType,
      difficulty,
      questions,
      metadata: {
        generated: true,
        chunksUsed: chunks.length,
        source: chunks[0]?.id ? "qdrant" : "database",
      },
    };
  } catch (error) {
    console.error("❌ Erreur:", error.message);
    onProgress({ step: 6, message: "⚠️ Erreur, fallback...", progress: 90 });
    return generateFallbackQuiz(text, questionCount);
  }
};

// Fallback global
const generateFallbackQuiz = (text, count) => {
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30 && s.length < 200)
    .slice(0, count);

  const questions = [];

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const words = sentence.split(" ");
    const keyWord = words.find((w) => w.length > 5) || words[0] || "concept";

    questions.push({
      id: i + 1,
      text: `Que dit le texte à propos de "${keyWord}" ?`,
      type: "qcm",
      choices: [
        sentence.substring(0, 60) + "...",
        `Le texte ne parle pas de ${keyWord}.`,
        `${keyWord} n'est pas mentionné.`,
        `Information incorrecte sur ${keyWord}.`,
      ].sort(() => Math.random() - 0.5),
      correctAnswer: sentence.substring(0, 60) + "...",
      explanation: `D'après le texte : "${sentence}"`,
      points: 1,
      timeLimit: 40,
      order: i + 1,
    });
  }

  while (questions.length < count) {
    questions.push({
      id: questions.length + 1,
      text: `Question ${questions.length + 1} sur le document`,
      type: "qcm",
      choices: ["Option A", "Option B", "Option C", "Option D"],
      correctAnswer: "Option A",
      explanation: "Basé sur le contenu du document.",
      points: 1,
      timeLimit: 40,
      order: questions.length + 1,
    });
  }

  return {
    title: "Quiz généré (mode dégradé)",
    documentType: "general",
    difficulty: "medium",
    questions: questions.slice(0, count),
    metadata: { generated: true, method: "fallback" },
  };
};

module.exports = { generateQuizFromText };
