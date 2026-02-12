const {
  Quiz,
  Question,
  Document,
  Section,
  QuizParticipant,
  User,
  Friend,
} = require("../models/Association");
const { Op } = require("sequelize");
const quizService = require("../services/quizService");
const aiQuizService = require("../services/iaQuizService");

const generateQuizFromDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const {
      mode = "solo",
      difficulty = "medium",
      selectedFriends = [],
    } = req.body;

    const document = await Document.findByPk(documentId, {
      include: [{ model: Section, as: "sections" }],
    });

    if (!document || document.userId !== req.user.id) {
      return res
        .status(404)
        .json({ message: "Document non trouvé ou accès refusé" });
    }

    // Concaténer tout le contenu
    const context = document.sections.map((s) => s.content).join("\n\n");

    // 🔥 DÉTECTION DU TYPE DE DOCUMENT BASÉ SUR LE NOM DU FICHIER ET LE CONTENU
    let documentType = "general";
    const fileName = document.fileName?.toLowerCase() || "";
    const sampleText = context.substring(0, 500).toLowerCase();

    // 1. D'abord vérifier le nom du fichier
    if (
      fileName.includes("cv") ||
      fileName.includes("curriculum") ||
      fileName.includes("resume")
    ) {
      documentType = "cv";
    } else if (
      fileName.includes("histoire") ||
      fileName.includes("historique")
    ) {
      documentType = "histoire";
    } else if (
      fileName.includes("science") ||
      fileName.includes("scientifique")
    ) {
      documentType = "scientifique";
    } else if (fileName.includes("math")) {
      documentType = "mathématiques";
    } else if (fileName.includes("politique")) {
      documentType = "politique";
    } else if (fileName.includes("économie") || fileName.includes("economie")) {
      documentType = "économique";
    } else if (
      fileName.includes("littérature") ||
      fileName.includes("litterature")
    ) {
      documentType = "littéraire";
    } else if (
      fileName.includes("médecine") ||
      fileName.includes("medecine") ||
      fileName.includes("santé")
    ) {
      documentType = "médical";
    } else if (
      fileName.includes("informatique") ||
      fileName.includes("programmation")
    ) {
      documentType = "informatique";
    }
    // 2. Sinon détecter par le contenu
    else {
      if (
        /(histoire|historique|date|siècle|antiquité|révolution|guerre)/i.test(
          sampleText,
        )
      ) {
        documentType = "histoire";
      } else if (
        /(biologie|chimie|physique|molécule|atome|cellule|gène|expérience)/i.test(
          sampleText,
        )
      ) {
        documentType = "scientifique";
      } else if (
        /(math|calcul|équation|formule|théorème|algèbre|géométrie)/i.test(
          sampleText,
        )
      ) {
        documentType = "mathématiques";
      } else if (
        /(politique|gouvernement|élection|démocratie|parlement|constitution)/i.test(
          sampleText,
        )
      ) {
        documentType = "politique";
      } else if (
        /(économie|finance|marché|entreprise|investissement|capital)/i.test(
          sampleText,
        )
      ) {
        documentType = "économique";
      } else if (
        /(littérature|roman|poème|auteur|écrivain|chapitre)/i.test(sampleText)
      ) {
        documentType = "littéraire";
      } else if (
        /(médecine|santé|maladie|traitement|patient|hôpital)/i.test(sampleText)
      ) {
        documentType = "médical";
      } else if (
        /(informatique|logiciel|programmation|développement|code|algorithme)/i.test(
          sampleText,
        )
      ) {
        documentType = "informatique";
      } else if (
        /(cv|curriculum|compétences|expérience|poste|formation|diplôme)/i.test(
          sampleText,
        )
      ) {
        documentType = "cv";
      }
    }

    console.log(`📁 Fichier: ${document.fileName}`);
    console.log(`🔍 Type de document détecté: ${documentType}`);

    // Analyser le document pour déterminer le nombre optimal de questions
    const optimalQuestionCount = calculateOptimalQuestionCount(context);

    console.log(
      `Document analysé - Longueur: ${context.length} caractères, ${context.split(/\s+/).length} mots`,
    );
    console.log(
      `Nombre optimal de questions déterminé: ${optimalQuestionCount}`,
    );

    // 🔥 PASSER LE documentType AU SERVICE IA
    const aiResult = await aiQuizService.generateQuizFromText(context, {
      questionCount: optimalQuestionCount,
      difficulty,
      documentType: documentType, // ← CRITIQUE: passer le type détecté
    });

    // 🔥 TITRE DYNAMIQUE BASÉ SUR LE TYPE DE DOCUMENT
    let title = "";
    if (documentType === "cv") {
      title = `Quiz sur CV - ${document.fileName.replace(/\.[^/.]+$/, "")}`;
    } else if (documentType === "histoire") {
      title = `Quiz d'histoire - ${document.fileName.replace(/\.[^/.]+$/, "")}`;
    } else if (documentType === "scientifique") {
      title = `Quiz scientifique - ${document.fileName.replace(/\.[^/.]+$/, "")}`;
    } else if (documentType === "mathématiques") {
      title = `Quiz de mathématiques - ${document.fileName.replace(/\.[^/.]+$/, "")}`;
    } else if (documentType === "politique") {
      title = `Quiz politique - ${document.fileName.replace(/\.[^/.]+$/, "")}`;
    } else if (documentType === "économique") {
      title = `Quiz économique - ${document.fileName.replace(/\.[^/.]+$/, "")}`;
    } else if (documentType === "littéraire") {
      title = `Quiz littéraire - ${document.fileName.replace(/\.[^/.]+$/, "")}`;
    } else if (documentType === "médical") {
      title = `Quiz médical - ${document.fileName.replace(/\.[^/.]+$/, "")}`;
    } else if (documentType === "informatique") {
      title = `Quiz informatique - ${document.fileName.replace(/\.[^/.]+$/, "")}`;
    } else {
      title =
        `Quiz - ${document.fileName.replace(/\.[^/.]+$/, "")}` ||
        aiResult.title;
    }

    const quiz = await quizService.createQuiz(
      {
        title: title,
        creatorId: req.user.id,
        documentId: documentId,
        mode: mode,
        difficulty: difficulty,
        questionCount: aiResult.questions.length,
        timeLimit: 40,
        status: "waiting",
        isGeneratedByAI: true,
        documentType: documentType,
      },
      aiResult.questions,
    );

    let invitationCode = null;
    if (mode === "multi") {
      invitationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      quiz.invitationCode = invitationCode;

      // Ajouter le créateur comme participant
      await QuizParticipant.create({
        quizId: quiz.id,
        userId: req.user.id,
        isReady: true,
        score: 0,
      });

      // Si des amis sont spécifiés, les inviter automatiquement
      if (selectedFriends && selectedFriends.length > 0) {
        const creator = await User.findByPk(req.user.id);

        if (global.io) {
          selectedFriends.forEach((friendId) => {
            global.io.to(`user_${friendId}`).emit("quiz:invitation", {
              quizId: quiz.id,
              quizTitle: title,
              invitationCode: invitationCode,
              fromUserId: req.user.id,
              fromUserName: creator.userName,
              createdAt: new Date(),
              directLink: `http://localhost:5173/home/quiz/multi?code=${invitationCode}`,
            });
          });
        }
      }
      await quiz.save();
    }

    res.status(201).json({
      success: true,
      message: "Quiz généré avec succès",
      quizId: quiz.id,
      invitationCode,
      questionCount: aiResult.questions.length,
      optimalQuestionCount: optimalQuestionCount,
      mode,
      documentType: documentType, // ← Retourner le type au frontend
      documentStats: {
        characters: context.length,
        words: context.split(/\s+/).length,
        sections: document.sections.length,
      },
    });
  } catch (error) {
    console.error("❌ Erreur génération quiz:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la génération",
    });
  }
};

// Fonction pour calculer le nombre optimal de questions
const calculateOptimalQuestionCount = (text) => {
  if (!text || text.trim().length === 0) {
    return 5; // Minimum par défaut
  }

  const cleanedText = text.trim();
  const characterCount = cleanedText.length;
  const wordCount = cleanedText.split(/\s+/).filter((w) => w.length > 1).length;
  const sentenceCount = (cleanedText.match(/[.!?]+/g) || []).length;

  console.log(
    `Analyse document: ${characterCount} caractères, ${wordCount} mots, ${sentenceCount} phrases`,
  );

  // Basé sur le nombre de mots
  if (wordCount < 300) {
    // Très court : 5-7 questions
    return Math.max(5, Math.min(7, Math.floor(wordCount / 50)));
  } else if (wordCount < 800) {
    // Court : 8-12 questions
    return Math.max(8, Math.min(12, Math.floor(wordCount / 70)));
  } else if (wordCount < 2000) {
    // Moyen : 10-15 questions
    return Math.max(10, Math.min(15, Math.floor(wordCount / 100)));
  } else if (wordCount < 5000) {
    // Long : 12-20 questions
    return Math.max(12, Math.min(20, Math.floor(wordCount / 150)));
  } else {
    // Très long : 15-25 questions (max)
    return Math.max(15, Math.min(25, Math.floor(wordCount / 250)));
  }
};
const createPredefinedQuiz = async (req, res) => {
  try {
    const {
      theme,
      difficulty = "medium",
      questionCount = 10,
      mode = "solo",
    } = req.body;

    const predefinedQuestions = {
      histoire: [
        {
          text: "En quelle année a eu lieu la Révolution française?",
          type: "qcm",
          choices: ["1789", "1799", "1776", "1815"],
          correctAnswer: "1789",
          explanation:
            "La Révolution française a commencé en 1789 avec la prise de la Bastille.",
          points: 1,
        },
      ],
      science: [
        {
          text: "Quel est l'élément chimique avec le symbole 'O'?",
          type: "qcm",
          choices: ["Or", "Osmium", "Oxygène", "Oganesson"],
          correctAnswer: "Oxygène",
          explanation:
            "L'oxygène a pour symbole chimique 'O' et est essentiel à la vie.",
          points: 1,
        },
      ],
      géographie: [
        {
          text: "Quelle est la capitale du Japon?",
          type: "qcm",
          choices: ["Séoul", "Pékin", "Tokyo", "Bangkok"],
          correctAnswer: "Tokyo",
          explanation: "Tokyo est la capitale du Japon depuis 1868.",
          points: 1,
        },
      ],
    };

    const questions = predefinedQuestions[theme]?.slice(0, questionCount) || [];

    if (questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Thème non disponible",
        availableThemes: Object.keys(predefinedQuestions),
      });
    }

    const quiz = await quizService.createQuiz(
      {
        title: `Quiz ${theme.charAt(0).toUpperCase() + theme.slice(1)}`,
        creatorId: req.user.id,
        mode: mode,
        difficulty: difficulty,
        questionCount: questions.length,
        timeLimit: 40,
        status: "waiting",
        isPredefined: true,
        theme: theme,
      },
      questions,
    );

    let invitationCode = null;
    if (mode === "multi") {
      invitationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      quiz.invitationCode = invitationCode;
      await quiz.save();
    }

    res.status(201).json({
      success: true,
      message: "Quiz prédéfini créé",
      quizId: quiz.id,
      invitationCode,
      questionCount: questions.length,
      theme,
      mode,
    });
  } catch (error) {
    console.error("Erreur création quiz:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la création",
    });
  }
};

const joinQuizByCode = async (req, res) => {
  try {
    const { code } = req.params;

    const result = await quizService.joinQuizByCode(code, req.user.id);

    res.json({
      success: true,
      message: "Vous avez rejoint le quiz",
      quizId: result.quiz.id,
      title: result.quiz.title,
      creator: {
        id: result.quiz.creator.id,
        name: result.quiz.creator.userName,
        photo: result.quiz.creator.userPhoto,
      },
      mode: result.quiz.mode,
      participantId: result.participant.id,
    });
  } catch (error) {
    console.error("Erreur rejoindre quiz:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const startQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await quizService.startQuiz(id, req.user.id);

    res.json({
      success: true,
      message: "Quiz démarré",
      quizId: result.quiz.id,
      firstQuestion: result.firstQuestion,
      totalQuestions: result.quiz.questionCount,
    });
  } catch (error) {
    console.error("Erreur démarrage quiz:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const setPlayerReady = async (req, res) => {
  try {
    const { id } = req.params;

    const participant = await QuizParticipant.findOne({
      where: { quizId: id, userId: req.user.id },
    });

    if (!participant) {
      return res.status(404).json({ message: "Participant non trouvé" });
    }

    participant.isReady = true;
    await participant.save();

    res.json({
      success: true,
      message: "Vous êtes prêt",
      participantId: participant.id,
    });
  } catch (error) {
    console.error("Erreur setPlayerReady:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

const endQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifiez d'abord le statut actuel
    const quiz = await Quiz.findByPk(id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz non trouvé",
      });
    }

    // Si le quiz est déjà terminé, retournez quand même les résultats
    if (quiz.status === "finished") {
      const participants = await QuizParticipant.findAll({
        where: { quizId: id },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "userName", "userPhoto"],
          },
        ],
        order: [
          ["score", "DESC"],
          ["lastAnswerAt", "ASC"],
        ],
      });

      return res.json({
        success: true,
        message: "Quiz déjà terminé - résultats récupérés",
        finalScores: participants.map((p) => ({
          userId: p.userId,
          userName: p.user.userName,
          userPhoto: p.user.userPhoto,
          score: p.score,
          position: p.position || 0,
        })),
        winner: participants[0] || null,
        quizId: quiz.id,
      });
    }

    const result = await quizService.endQuiz(id, req.user.id);

    res.json({
      success: true,
      message: "Quiz terminé",
      finalScores: result.finalScores,
      winner: result.finalScores[0],
      quizId: result.quiz.id,
    });
  } catch (error) {
    console.error("Erreur fin quiz:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getNextQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const quiz = await Quiz.findByPk(id);
    if (!quiz || quiz.status !== "running") {
      return res.status(400).json({ message: "Quiz non actif" });
    }

    const questions = await Question.findAll({
      where: { quizId: id },
      order: [["order", "ASC"]],
      attributes: { exclude: ["correctAnswer"] },
    });

    const currentIndex = quiz.currentQuestionIndex || 0;

    if (currentIndex >= questions.length) {
      return res.status(404).json({
        message: "Plus de questions disponibles",
        quizCompleted: true,
      });
    }

    const nextQuestion = questions[currentIndex];

    quiz.currentQuestionIndex = currentIndex + 1;
    await quiz.save();

    const formattedQuestion = {
      id: nextQuestion.id,
      text: nextQuestion.text,
      type: nextQuestion.type,
      choices: nextQuestion.choices || [],
      order: nextQuestion.order,
      timeLimit: nextQuestion.timeLimit,
      points: nextQuestion.points,
      totalQuestions: questions.length,
      currentQuestion: currentIndex + 1,
    };

    res.json(formattedQuestion);
  } catch (error) {
    console.error("Erreur nextQuestion:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

const getQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    const quiz = await Quiz.findByPk(id, {
      include: [
        {
          model: Question,
          as: "questions",
          order: [["order", "ASC"]],
          attributes: { exclude: ["correctAnswer"] },
        },
        {
          model: User,
          as: "creator",
          attributes: ["id", "userName", "userPhoto"],
        },
        {
          model: QuizParticipant,
          as: "participants",
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "userName", "userPhoto"],
            },
          ],
        },
      ],
    });

    if (!quiz) {
      return res.status(404).json({ message: "Quiz non trouvé" });
    }

    res.json({
      success: true,
      quiz,
    });
  } catch (error) {
    console.error("Erreur getQuiz:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

const getUserQuizzes = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type = "all", page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let where = {};

    if (type === "created") {
      where.creatorId = userId;
    } else if (type === "participating") {
      // Récupérer via QuizParticipant
      const participations = await QuizParticipant.findAll({
        where: { userId },
        attributes: ["quizId"],
        raw: true,
      });

      const quizIds = participations.map((p) => p.quizId);
      where.id = { [Op.in]: quizIds };
    }

    const { count, rows } = await Quiz.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "userName", "userPhoto"],
        },
        {
          model: QuizParticipant,
          as: "participants",
          attributes: ["userId", "score", "isReady"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      quizzes: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error("Erreur getUserQuizzes:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

const cancelQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    const quiz = await Quiz.findByPk(id);

    if (!quiz || quiz.creatorId !== req.user.id) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    if (quiz.status === "running") {
      return res
        .status(400)
        .json({ message: "Impossible d'annuler un quiz en cours" });
    }

    await quiz.destroy();

    res.json({
      success: true,
      message: "Quiz annulé",
      quizId: id,
    });
  } catch (error) {
    console.error("Erreur cancelQuiz:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
const detailQuiz = async (req, res) => {
  try {
    const { code } = req.params;

    const quiz = await Quiz.findOne({
      where: { invitationCode: code },
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "userName", "userPhoto"],
        },
      ],
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz non trouvé",
      });
    }

    res.json({
      success: true,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        creatorId: quiz.creatorId,
        creator: quiz.creator,
        status: quiz.status,
        questionCount: quiz.questionCount,
        invitationCode: quiz.invitationCode,
      },
    });
  } catch (error) {
    console.error("Erreur récupération détails quiz:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

module.exports = {
  generateQuizFromDocument,
  createPredefinedQuiz,
  joinQuizByCode,
  startQuiz,
  setPlayerReady,
  endQuiz,
  getNextQuestion,
  getQuiz,
  getUserQuizzes,
  cancelQuiz,
  detailQuiz,
};
