// services/iaQuizService.js - VERSION CORRIGÉE
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
    else adjustedCount = Math.min(4, questionCount);

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

module.exports = { generateQuizFromText };
