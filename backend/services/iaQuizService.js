/*// services/iaQuizService.js - VERSION CORRIGÉE
const ollamaService = require("../config/ollama");

// Détection de la langue
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

// Extraction des parties pertinentes
const extractRelevantParts = (text, maxLength = 2000) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength);
};

// 🔥 NOUVEAU PROMPT PLUS SIMPLE
const buildQuizPrompt = (text, options) => {
  const { questionCount } = options;

  return `Génère ${questionCount} questions QCM en français basées sur ce texte.

RÈGLES:
- Réponds UNIQUEMENT avec du JSON valide
- Pas de texte avant ou après
- 4 propositions par question
- La bonne réponse doit être dans les propositions

FORMAT:
{
  "questions": [
    {
      "text": "Question?",
      "choices": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": "Option 1",
      "explanation": "Explication"
    }
  ]
}

TEXTE:
${text}

JSON:`;
};

// 🔥 EXTRACTION JSON ROBUSTE
const extractJSON = (text) => {
  try {
    // Nettoyer le texte
    let cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .replace(/\\n/g, " ")
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Chercher le premier { et dernier }
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start === -1 || end === -1) return null;

    let jsonStr = cleaned.substring(start, end + 1);

    // Réparer les erreurs courantes
    jsonStr = jsonStr
      .replace(/,(\s*[}\]])/g, "$1") // Virgules en trop
      .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3'); // Clés sans quotes

    return JSON.parse(jsonStr);
  } catch (e) {
    console.log("❌ Erreur JSON:", e.message);
    return null;
  }
};

// 🔥 VALIDATION DES QUESTIONS
const validateQuestions = (questions) => {
  if (!questions || !Array.isArray(questions)) return [];

  return questions.filter(
    (q) =>
      q.text &&
      q.text.length > 10 &&
      q.choices &&
      q.choices.length === 4 &&
      q.correctAnswer &&
      q.choices.includes(q.correctAnswer),
  );
};

// 🔥 FALLBACK SIMPLE MAIS EFFICACE
const generateFallbackQuestions = (text, count = 4) => {
  console.log("🔄 Génération de questions fallback...");

  // Extraire les phrases
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
    });
  }

  // Compléter si pas assez de phrases
  while (questions.length < count) {
    questions.push({
      text: `Question ${questions.length + 1} sur le document`,
      type: "qcm",
      choices: ["Option A", "Option B", "Option C", "Option D"],
      correctAnswer: "Option A",
      explanation: "Basé sur le contenu du document.",
      points: 1,
    });
  }

  return {
    title: "Quiz généré",
    questions: questions.slice(0, count),
  };
};

// 🔥 FONCTION PRINCIPALE
const generateQuizFromText = async (text, options = {}) => {
  const {
    questionCount = 4,
    difficulty = "medium",
    documentType = "general",
    onProgress = () => {},
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes

  try {
    onProgress({ step: 1, message: "🧹 Préparation...", progress: 10 });

    if (!text || text.length < 100) {
      throw new Error("Texte trop court");
    }

    const cleanText = text.replace(/\s+/g, " ").trim().substring(0, 2000);
    const wordCount = cleanText.split(/\s+/).length;

    onProgress({
      step: 2,
      message: `📊 ${wordCount} mots trouvés`,
      progress: 20,
    });

    // Adapter le nombre de questions
    let adjustedCount = questionCount;
    if (wordCount < 300) adjustedCount = 2;
    else if (wordCount < 600) adjustedCount = 3;
    else if (wordCount < 1000) adjustedCount = 4;
    else if (wordCount < 2000) adjustedCount = 5;
    else if (wordCount < 4000) adjustedCount = 6;
    else adjustedCount = Math.min(8, questionCount);

    onProgress({
      step: 3,
      message: `🤖 Génération de ${adjustedCount} questions...`,
      progress: 30,
    });

    const prompt = buildQuizPrompt(cleanText, {
      questionCount: adjustedCount,
      difficulty,
      documentType,
    });

    console.log("🚀 Envoi à Ollama...");
    const response = await ollamaService.generate(prompt, {
      temperature: 0.2,
      max_tokens: 1000,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    onProgress({ step: 4, message: "📥 Analyse...", progress: 60 });

    const quizData = extractJSON(response);

    if (!quizData || !quizData.questions) {
      console.log("⚠️ JSON invalide, fallback");
      return generateFallbackQuestions(cleanText, adjustedCount);
    }

    const validQuestions = validateQuestions(quizData.questions);

    if (validQuestions.length === 0) {
      console.log("⚠️ Aucune question valide, fallback");
      return generateFallbackQuestions(cleanText, adjustedCount);
    }

    onProgress({
      step: 5,
      message: `✅ ${validQuestions.length} questions`,
      progress: 100,
    });

    return {
      title: quizData.title || `Quiz ${documentType}`,
      documentType,
      difficulty,
      questions: validQuestions.slice(0, adjustedCount),
      metadata: { generated: true },
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("❌ Erreur:", error.message);

    onProgress({ step: 6, message: "⚠️ Fallback...", progress: 90 });

    return generateFallbackQuestions(text, questionCount);
  }
};

module.exports = { generateQuizFromText };*/
// services/iaQuizService.js - VERSION AVEC QDRANT
const ollamaService = require("../config/ollama");
const VectorService = require("./vectorService");

// Détection de la langue
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

// 🔥 NOUVEAU PROMPT PLUS INTELLIGENT
const buildQuizPrompt = (chunks, questionNumber, totalQuestions) => {
  // Prendre un chunk spécifique pour cette question
  const chunk = chunks[questionNumber - 1];

  return `Génère UNE question QCM en français basée sur ce passage.

PASSAGE:
${chunk.content.substring(0, 800)}

RÈGLES:
- Réponds UNIQUEMENT avec du JSON valide
- 4 propositions par question
- La bonne réponse doit être dans les propositions
- Sois précis et basé uniquement sur le passage

FORMAT:
{
  "text": "Question?",
  "choices": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "correctAnswer": "Option 1",
  "explanation": "Explication basée sur le passage"
}

JSON:`;
};

// 🔥 EXTRACTION JSON ROBUSTE
const extractJSON = (text) => {
  try {
    let cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .replace(/\\n/g, " ")
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start === -1 || end === -1) return null;

    let jsonStr = cleaned.substring(start, end + 1);

    jsonStr = jsonStr
      .replace(/,(\s*[}\]])/g, "$1")
      .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');

    return JSON.parse(jsonStr);
  } catch (e) {
    console.log("❌ Erreur JSON:", e.message);
    return null;
  }
};

// 🔥 VALIDATION DES QUESTIONS
const validateQuestion = (q) => {
  return (
    q.text &&
    q.text.length > 10 &&
    q.choices &&
    Array.isArray(q.choices) &&
    q.choices.length === 4 &&
    q.correctAnswer &&
    q.choices.includes(q.correctAnswer) &&
    q.explanation &&
    q.explanation.length > 5
  );
};

// 🔥 GÉNÉRATION D'UNE QUESTION
const generateSingleQuestion = async (chunk, index, total) => {
  try {
    const prompt = buildQuizPrompt([chunk], 1, total);

    const response = await ollamaService.generate(prompt, {
      temperature: 0.3 + Math.random() * 0.2, // Légère variation
      max_tokens: 300,
    });

    const questionData = extractJSON(response);

    if (!questionData || !validateQuestion(questionData)) {
      throw new Error("Question invalide");
    }

    return {
      ...questionData,
      type: "qcm",
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

// 🔥 FALLBACK POUR UNE QUESTION
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

// 🔥 FONCTION PRINCIPALE AMÉLIORÉE
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

    // Récupérer les chunks depuis Qdrant
    onProgress({
      step: 2,
      message: "🔍 Récupération des passages...",
      progress: 20,
    });

    const chunks = await VectorService.getRandomChunks(
      documentId,
      questionCount,
    );

    if (!chunks || chunks.length === 0) {
      throw new Error("Aucun passage trouvé dans Qdrant");
    }

    console.log(`📚 ${chunks.length} passages récupérés de Qdrant`);

    onProgress({
      step: 3,
      message: `🤖 Génération de ${chunks.length} questions...`,
      progress: 30,
    });

    // Générer les questions en parallèle (mais limité à 3 à la fois)
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
        step: 4,
        message: `✅ ${questions.length}/${chunks.length} questions générées`,
        progress: 30 + (questions.length / chunks.length) * 60,
      });
    }

    // Trier par ordre
    questions.sort((a, b) => a.order - b.order);

    onProgress({ step: 5, message: `✅ Quiz prêt`, progress: 100 });

    // Créer le titre
    const firstChunk = chunks[0];
    let title = `Quiz ${documentType}`;
    if (firstChunk && firstChunk.content) {
      const firstLine = firstChunk.content.split("\n")[0];
      if (firstLine && firstLine.length < 100) {
        title = `Quiz: ${firstLine.substring(0, 50)}...`;
      }
    }

    return {
      title,
      documentType,
      difficulty,
      questions,
      metadata: {
        generated: true,
        chunksUsed: chunks.length,
        method: "qdrant-enhanced",
      },
    };
  } catch (error) {
    console.error("❌ Erreur:", error.message);

    onProgress({ step: 6, message: "⚠️ Mode dégradé...", progress: 90 });

    // Fallback: utiliser le texte entier
    return generateFallbackQuiz(text, questionCount);
  }
};

// Fallback sans Qdrant
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
