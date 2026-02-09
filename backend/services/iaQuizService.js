const { model } = require("../config/openai");

const generateQuizFromText = async (text, options = {}) => {
  const {
    questionCount = 10,
    difficulty = "medium",
    documentType = "general",
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

    let documentContext = "";
    if (
      documentType === "cv" ||
      /(cv|curriculum|résumé)/i.test(cleanText.substring(0, 200))
    ) {
      documentContext =
        "CV/Curriculum Vitae - Informations personnelles et professionnelles";
    } else if (/(histoire|historique|date|siècle)/i.test(cleanText)) {
      documentContext = "Document historique";
    } else if (/(chimie|molécule|atome|élément)/i.test(cleanText)) {
      documentContext = "Document scientifique (chimie)";
    } else if (/(math|calcul|équation|formule)/i.test(cleanText)) {
      documentContext = "Document mathématique";
    } else if (/(politique|gouvernement|élection)/i.test(cleanText)) {
      documentContext = "Document politique";
    }

    const prompt = `
Tu es un expert en création de quiz éducatifs adaptés au type de document.

TYPE DE DOCUMENT: ${documentContext || "Document général"}
DIFFICULTÉ: ${difficulty}
NOMBRE DE QUESTIONS: ${questionCount}

TEXTE SOURCE:
"""
${cleanText.substring(0, 4000)}
"""

IMPORTANT: Pour les questions à choix multiples (type "multiple"), le champ "choices" DOIT contenir un tableau d'options de réponse.

EXEMPLE CORRECT:
{
  "text": "Quelles technologies sont mentionnées dans les compétences techniques ?",
  "type": "multiple",
  "choices": ["React.js", "Node.js", "MongoDB", "Angular", "Vue.js", "PHP"],
  "correctAnswer": ["React.js", "Node.js", "MongoDB"],
  "explanation": "Les compétences mentionnées sont React.js, Node.js et MongoDB selon la section compétences.",
  "points": 2
}

FORMAT JSON STRICT À RETOURNER:
{
  "title": "Quiz sur [Type de document] - [Thème principal]",
  "documentType": "${documentContext || "general"}",
  "questions": [
    {
      "text": "Question claire et complète",
      "type": "qcm | multiple | open",
      "choices": ["Option 1", "Option 2", "Option 3", "Option 4"], // REQUIS si type est qcm ou multiple
      "correctAnswer": "Réponse correcte ou tableau de réponses pour multiple",
      "explanation": "Explication détaillée",
      "points": 1,
      "difficulty": "${difficulty}"
    }
  ]
}

RÈGLES:
1. TOUTES les questions de type "qcm" ou "multiple" DOIVENT avoir un tableau "choices" non vide
2. Pour "multiple": "correctAnswer" doit être un tableau
3. Pour "qcm": "correctAnswer" doit être une chaîne
4. Pour "open": "choices" peut être omis
5. Les questions doivent être spécifiques au texte
`;

    console.log(
      `Génération de ${questionCount} questions pour document type: ${documentContext}`,
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

          // VALIDATION DES QUESTIONS MULTIPLES/QCM
          if (question.type === "multiple" || question.type === "qcm") {
            // S'assurer que choices existe et est un tableau non vide
            if (
              !question.choices ||
              !Array.isArray(question.choices) ||
              question.choices.length === 0
            ) {
              console.warn(
                `Question ${index + 1}: Pas d'options pour une question ${question.type}, conversion en open`,
              );
              question.type = "open";
              delete question.choices;
            } else {
              // Nettoyer les options
              question.choices = question.choices
                .map((choice) => choice.toString().trim())
                .filter((choice) => choice.length > 0);

              // S'assurer d'avoir au moins 2 options
              if (question.choices.length < 2) {
                console.warn(
                  `Question ${index + 1}: Pas assez d'options, conversion en open`,
                );
                question.type = "open";
                delete question.choices;
              }
            }
          }

          // Validation des réponses correctes
          if (question.type === "multiple") {
            if (
              !question.correctAnswer ||
              !Array.isArray(question.correctAnswer)
            ) {
              question.correctAnswer = question.choices
                ? [question.choices[0]]
                : [];
            }
            // S'assurer que toutes les réponses correctes sont dans les choix
            question.correctAnswer = question.correctAnswer
              .map((ans) => ans.toString().trim())
              .filter((ans) => question.choices?.includes(ans));
          } else if (question.type === "qcm") {
            if (
              !question.correctAnswer ||
              typeof question.correctAnswer !== "string"
            ) {
              question.correctAnswer = question.choices?.[0] || "";
            }
          }

          // Ajouter une explication par défaut si manquante
          if (!question.explanation) {
            question.explanation = `La réponse correcte est: ${
              Array.isArray(question.correctAnswer)
                ? question.correctAnswer.join(", ")
                : question.correctAnswer
            }`;
          }

          return question;
        })
        .filter((q) => q.text && q.text.length > 5); // Filtrer les questions vides

      // Vérifier qu'on a assez de questions
      if (quizData.questions.length < Math.min(3, questionCount)) {
        console.warn(
          `Seulement ${quizData.questions.length} questions valides, utilisation du fallback`,
        );
        throw new Error("Pas assez de questions valides");
      }

      return quizData;
    } else {
      throw new Error("Format de réponse JSON invalide de l'IA");
    }
  } catch (error) {
    console.error("Erreur génération quiz IA:", error.message);
    return generateAdaptiveFallbackQuiz(
      cleanText || text.replace(/\s+/g, " ").trim(),
      questionCount,
      documentType,
    );
  }
};

// Fallback adaptatif avec validation renforcée
const generateAdaptiveFallbackQuiz = (
  text,
  targetCount,
  documentType = "general",
) => {
  console.log(
    `Fallback adaptatif pour ${targetCount} questions (type: ${documentType})`,
  );

  const cleanText = text.replace(/\s+/g, " ").trim();
  const sentences = cleanText
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  const lines = cleanText.split("\n").filter((line) => line.trim().length > 5);

  const isCV =
    documentType.includes("CV") ||
    /(cv|curriculum|résumé|compétences|expérience)/i.test(
      cleanText.substring(0, 300),
    ) ||
    /(SIMO|DIMITRI|Marseille|FRANCE)/i.test(cleanText);

  const questions = [];

  if (isCV) {
    console.log("Détection CV - génération de questions spécifiques");

    // 1. Question sur le nom
    const nameMatch = cleanText.match(/^([A-ZÀ-ÿ]+\s+[A-ZÀ-ÿ]+)/);
    if (nameMatch && questions.length < targetCount) {
      questions.push({
        text: "Quel est le nom complet de la personne dans ce CV ?",
        type: "qcm",
        choices: [nameMatch[0], "Jean Martin", "Marie Dupont", "Pierre Leroy"],
        correctAnswer: nameMatch[0],
        explanation: `Le nom "${nameMatch[0]}" apparaît en tête du document.`,
        points: 1,
        order: 1,
      });
    }

    // 2. Question sur les compétences (toujours QCM simple, pas multiple)
    const skillsKeywords = [
      "React",
      "Node.js",
      "JavaScript",
      "TypeScript",
      "MongoDB",
      "MySQL",
      "Docker",
      "Express",
      "NestJS",
      "HTML",
      "CSS",
      "Tailwind",
      "Redux",
      "Python",
      "Java",
      "Git",
      "API",
      "REST",
      "JWT",
      "WebSocket",
    ];

    const foundSkills = [];
    for (const skill of skillsKeywords) {
      if (new RegExp(`\\b${skill}\\b`, "i").test(cleanText)) {
        foundSkills.push(skill);
        if (foundSkills.length >= 4) break;
      }
    }

    if (foundSkills.length > 0 && questions.length < targetCount) {
      const fakeSkills = ["Angular", "PHP", "Ruby", "Swift", "Kotlin", "C#"];
      const allChoices = [...foundSkills.slice(0, 2)];

      // Ajouter 2 fausses options
      for (let i = 0; allChoices.length < 4 && i < fakeSkills.length; i++) {
        if (!foundSkills.includes(fakeSkills[i])) {
          allChoices.push(fakeSkills[i]);
        }
      }

      questions.push({
        text: "Parmi ces technologies, laquelle est mentionnée dans le document ?",
        type: "qcm", // Toujours QCM simple pour éviter les problèmes
        choices: allChoices.slice(0, 4),
        correctAnswer: foundSkills[0],
        explanation: `La technologie "${foundSkills[0]}" est mentionnée dans les compétences techniques.`,
        points: 1,
        order: questions.length + 1,
      });
    }

    // 3. Question sur les dates d'expérience
    const dateMatches = cleanText.match(/(\d{4}\s*[-–]\s*\d{4})/g);
    if (
      dateMatches &&
      dateMatches.length > 0 &&
      questions.length < targetCount
    ) {
      questions.push({
        text: "Quelle période est mentionnée comme la plus récente dans le document ?",
        type: "qcm",
        choices: [
          dateMatches[0],
          dateMatches[1] || "2022 - 2023",
          "2021 - 2022",
          "2020 - 2021",
        ],
        correctAnswer: dateMatches[0],
        explanation: `La période "${dateMatches[0]}" est mentionnée comme la période actuelle ou la plus récente.`,
        points: 1,
        order: questions.length + 1,
      });
    }

    // 4. Question sur l'email
    const emailMatch = cleanText.match(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
    );
    if (emailMatch && questions.length < targetCount) {
      questions.push({
        text: "Quelle adresse email est fournie dans le document ?",
        type: "qcm",
        choices: [
          emailMatch[0],
          "contact@example.com",
          "info@entreprise.fr",
          "admin@site.com",
        ],
        correctAnswer: emailMatch[0],
        explanation: `L'adresse email "${emailMatch[0]}" est indiquée dans les coordonnées.`,
        points: 1,
        order: questions.length + 1,
      });
    }

    // 5. Question sur la localisation
    if (
      /(Marseille|Paris|Lyon|France)/i.test(cleanText) &&
      questions.length < targetCount
    ) {
      const locationMatch = cleanText.match(/(Marseille|Paris|Lyon|France)/i);
      if (locationMatch) {
        questions.push({
          text: "Où se situe la personne selon le document ?",
          type: "qcm",
          choices: [
            locationMatch[0],
            "Londres, Royaume-Uni",
            "Berlin, Allemagne",
            "Madrid, Espagne",
          ],
          correctAnswer: locationMatch[0],
          explanation: `La localisation "${locationMatch[0]}" est mentionnée dans le document.`,
          points: 1,
          order: questions.length + 1,
        });
      }
    }
  } else {
    // Pour les documents généraux - questions plus simples
    console.log("Document général - questions basiques");

    for (let i = 0; i < Math.min(targetCount, sentences.length, 8); i++) {
      if (questions.length >= targetCount) break;

      const sentence = sentences[i];
      if (sentence.length < 20) continue;

      const words = sentence.split(/\s+/);
      const keyWord =
        words.find(
          (w) => w.length > 4 && !/^(les|des|une|pour|dans|avec)$/i.test(w),
        ) ||
        words[0] ||
        "document";

      questions.push({
        text: `Que mentionne le document à propos de : "${sentence.substring(0, 80)}" ?`,
        type: "qcm",
        choices: [
          `Cela concerne ${keyWord}`,
          "C'est un détail secondaire",
          "Il s'agit d'une introduction",
          "C'est une conclusion",
        ],
        correctAnswer: `Cela concerne ${keyWord}`,
        explanation: `Le document mentionne: ${sentence.substring(0, 120)}`,
        points: 1,
        order: questions.length + 1,
      });
    }
  }

  // Questions génériques de secours
  const genericQuestions = [
    {
      text: "Quel est le type principal de ce document ?",
      type: "qcm",
      choices: [
        "Document informatif",
        "Document technique",
        "Document narratif",
        "Document administratif",
      ],
      correctAnswer: "Document informatif",
      explanation: "Le document présente principalement des informations.",
      points: 1,
    },
    {
      text: "Comment est structuré ce document ?",
      type: "qcm",
      choices: [
        "De manière organisée avec des sections",
        "Comme un récit continu",
        "Sous forme de liste",
        "Comme un dialogue",
      ],
      correctAnswer: "De manière organisée avec des sections",
      explanation: "Le document semble organisé en sections distinctes.",
      points: 1,
    },
    {
      text: "Quel est l'objectif principal de ce document ?",
      type: "qcm",
      choices: [
        "Présenter des informations",
        "Raconter une histoire",
        "Donner des instructions",
        "Poser des questions",
      ],
      correctAnswer: "Présenter des informations",
      explanation: "Le document vise à présenter des informations au lecteur.",
      points: 1,
    },
  ];

  // Ajouter des questions génériques si nécessaire
  while (questions.length < Math.min(targetCount, 5)) {
    const genIndex = questions.length % genericQuestions.length;
    questions.push({
      ...genericQuestions[genIndex],
      order: questions.length + 1,
    });
  }

  // VALIDATION FINALE : s'assurer que toutes les questions ont des options si QCM
  const validatedQuestions = questions.slice(0, targetCount).map((q, index) => {
    const validated = { ...q, order: index + 1 };

    if (validated.type === "qcm" || validated.type === "multiple") {
      if (
        !validated.choices ||
        !Array.isArray(validated.choices) ||
        validated.choices.length === 0
      ) {
        console.warn(
          `Question ${index + 1}: Pas d'options, conversion en open`,
        );
        validated.type = "open";
        delete validated.choices;
      } else {
        // S'assurer d'avoir au moins 2 options uniques
        const uniqueChoices = [
          ...new Set(validated.choices.map((c) => c.toString().trim())),
        ];
        if (uniqueChoices.length < 2) {
          console.warn(
            `Question ${index + 1}: Pas assez d'options uniques, conversion en open`,
          );
          validated.type = "open";
          delete validated.choices;
        } else {
          validated.choices = uniqueChoices.slice(0, 4);
        }
      }
    }

    return validated;
  });

  return {
    title: `Quiz sur ${isCV ? "CV professionnel" : documentType}`,
    documentType: isCV ? "cv" : documentType,
    questions: validatedQuestions,
  };
};

module.exports = {
  generateQuizFromText,
  generateAdaptiveFallbackQuiz,
};
