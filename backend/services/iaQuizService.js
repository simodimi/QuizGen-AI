const { model } = require("../config/openai");

const generateQuizFromText = async (text, options = {}) => {
  const {
    questionCount = 10,
    difficulty = "medium",
    documentType = "general", // ← "general" par défaut, plus "cv" spécifique
  } = options;

  let cleanText = "";

  try {
    cleanText = text
      .replace(/\s+/g, " ")
      .replace(/[^\w\s.,!?\-:;()'"À-ÿ]/g, " ")
      .trim();

    if (cleanText.length < 100) {
      throw new Error("Texte trop court pour générer un quiz");
    }

    // Détection générique du type de document basée sur le contenu
    let documentContext = documentType || "general";

    // Utiliser le type passé en paramètre si disponible
    if (options.documentType && options.documentType !== "general") {
      documentContext = options.documentType;
      console.log(`📌 Type de document forcé: ${documentContext}`);
    }
    // Sinon, essayer de détecter automatiquement
    else {
      const sampleText = cleanText.substring(0, 500).toLowerCase();

      if (
        /(histoire|historique|date|siècle|antiquité|révolution|guerre)/i.test(
          sampleText,
        )
      ) {
        documentContext = "histoire";
      } else if (
        /(biologie|chimie|physique|molécule|atome|cellule|gène|expérience)/i.test(
          sampleText,
        )
      ) {
        documentContext = "scientifique";
      } else if (
        /(math|calcul|équation|formule|théorème|algèbre|géométrie)/i.test(
          sampleText,
        )
      ) {
        documentContext = "mathématiques";
      } else if (
        /(politique|gouvernement|élection|démocratie|parlement|constitution)/i.test(
          sampleText,
        )
      ) {
        documentContext = "politique";
      } else if (
        /(économie|finance|marché|entreprise|investissement|capital)/i.test(
          sampleText,
        )
      ) {
        documentContext = "économique";
      } else if (
        /(littérature|roman|poème|auteur|écrivain|chapitre)/i.test(sampleText)
      ) {
        documentContext = "littéraire";
      } else if (
        /(médecine|santé|maladie|traitement|patient|hôpital)/i.test(sampleText)
      ) {
        documentContext = "médical";
      } else if (
        /(informatique|logiciel|programmation|développement|code|algorithme)/i.test(
          sampleText,
        )
      ) {
        documentContext = "informatique";
      } else if (
        /(cv|curriculum|compétences|expérience|poste|formation|diplôme)/i.test(
          sampleText,
        )
      ) {
        documentContext = "cv";
      } else {
        documentContext = "général";
      }

      console.log(`🔍 Type de document détecté: ${documentContext}`);
    }

    const prompt = `
Tu es un expert en création de quiz éducatifs adaptés au type de document.

TYPE DE DOCUMENT: ${documentContext}
DIFFICULTÉ: ${difficulty}
NOMBRE DE QUESTIONS: ${questionCount}

TEXTE SOURCE:
"""
${cleanText.substring(0, 4000)}
"""

IMPORTANT: 
- GÉNÈRE ${questionCount} questions ORIGINALES et SPÉCIFIQUES à ce document ${documentContext}.
- Les questions doivent être UNIQUEMENT basées sur le texte fourni
- Les questions DOIVENT être basées UNIQUEMENT sur le texte source fourni
- Ne PAS inventer d'informations qui ne sont pas dans le texte
- Ne PAS réutiliser d'anciennes questions de quiz précédents
- Crée des questions ORIGINALES et SPÉCIFIQUES à ce document

FORMAT JSON STRICT À RETOURNER:
{
  "title": "Quiz sur ${documentContext} - [Thème principal du document]",
  "documentType": "${documentContext}",
  "questions": [
    {
      "text": "Question claire et complète",
      "type": "qcm | multiple | open",
      "choices": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": "Réponse correcte",
      "explanation": "Explication détaillée basée sur le texte",
      "points": 1,
      "difficulty": "${difficulty}"
    }
  ]
}

RÈGLES:
1. TOUTES les questions DOIVENT être directement liées au texte
2. Pour les QCM: 4 options dont UNE seule correcte
3. Pour "multiple": au moins 2 réponses correctes
4. Pour "open": réponse libre (une phrase)
`;

    console.log(
      `📝 Génération de ${questionCount} questions pour document type: ${documentContext}`,
    );

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const textResponse = response.text();

    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      let quizData;
      try {
        quizData = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error("Erreur parsing JSON:", parseError);
        throw new Error("Format JSON invalide");
      }

      // VALIDATION et POST-TRAITEMENT des questions
      quizData.questions = quizData.questions
        .map((q, index) => {
          const question = {
            ...q,
            text: (q.text || "").replace(/\.\.\.$/, "").trim(),
            order: index + 1,
            type: q.type || "qcm",
            points: q.points || 1,
            difficulty: q.difficulty || difficulty,
          };

          // Validation des options pour QCM et MULTIPLE
          if (question.type === "multiple" || question.type === "qcm") {
            if (
              !question.choices ||
              !Array.isArray(question.choices) ||
              question.choices.length < 2
            ) {
              console.warn(
                `Question ${index + 1}: Pas assez d'options, conversion en open`,
              );
              question.type = "open";
              delete question.choices;
            } else {
              question.choices = question.choices
                .map((choice) => choice.toString().trim())
                .filter((choice) => choice.length > 0)
                .slice(0, 4);
            }
          }

          return question;
        })
        .filter((q) => q.text && q.text.length > 5);

      return {
        ...quizData,
        documentType: documentContext,
      };
    } else {
      throw new Error("Format de réponse JSON invalide");
    }
  } catch (error) {
    console.error("❌ Erreur génération quiz IA:", error.message);
    return generateFallbackQuiz(
      text,
      questionCount,
      options.documentType || "general",
    );
  }
};

// 🔥 NOUVEAU: Fallback générique pour tous les types de documents
const generateFallbackQuiz = (text, targetCount, documentType = "general") => {
  console.log(`📋 Fallback pour document type: ${documentType}`);

  const cleanText = text.replace(/\s+/g, " ").trim();
  const sentences = cleanText
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  const questions = [];

  // Générer des questions basées sur les phrases du texte
  for (let i = 0; i < Math.min(targetCount, sentences.length); i++) {
    if (questions.length >= targetCount) break;

    const sentence = sentences[i];
    const words = sentence.split(/\s+/);
    const keyWords = words
      .filter(
        (w) =>
          w.length > 4 && !/^(les|des|une|pour|dans|avec|cette|ces)$/i.test(w),
      )
      .slice(0, 3);

    if (keyWords.length > 0) {
      questions.push({
        text: `Que dit le document à propos de "${keyWords.join(" ")}"?`,
        type: "qcm",
        choices: [
          sentence.substring(0, 60) + "...",
          "Cette information n'est pas dans le texte",
          "C'est un détail secondaire",
          "Le texte n'en parle pas directement",
        ],
        correctAnswer: sentence.substring(0, 60) + "...",
        explanation: `Le texte indique: "${sentence.substring(0, 150)}..."`,
        points: 1,
        order: questions.length + 1,
      });
    }
  }

  // Questions génériques si pas assez
  while (questions.length < Math.min(targetCount, 5)) {
    questions.push({
      text: `Quel est le thème principal de ce document ${documentType}?`,
      type: "qcm",
      choices: [
        `Document ${documentType}`,
        "Document technique",
        "Document narratif",
        "Document administratif",
      ],
      correctAnswer: `Document ${documentType}`,
      explanation: `Le document traite principalement de ${documentType}.`,
      points: 1,
      order: questions.length + 1,
    });
  }

  return {
    title: `Quiz - Document ${documentType}`,
    documentType: documentType,
    questions: questions.slice(0, targetCount),
  };
};

module.exports = {
  generateQuizFromText,
  generateFallbackQuiz,
};
