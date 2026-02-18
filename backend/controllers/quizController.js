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
const { analyzeDocumentStructure } = require("../services/sectionService");

const generateQuizFromDocument = async (req, res) => {
  try {
    if (global.quizGenerationLock === req.user.id) {
      return res.status(429).json({
        success: false,
        message: "Un quiz est déjà en cours de génération",
      });
    }

    global.quizGenerationLock = req.user.id;
    const { documentId } = req.params;
    const {
      mode = "solo",
      difficulty = "medium",
      selectedFriends = [],
    } = req.body;
    const userId = req.user.id;

    // Fonction pour envoyer la progression via Socket.IO
    const sendProgress = (step, message, progress) => {
      if (global.io) {
        global.io.to(`user_${userId}`).emit("quiz:generation_progress", {
          step,
          message,
          progress,
          timestamp: new Date().toISOString(),
        });
      }
      console.log(`📊 [${progress}%] ${message}`);
    };

    sendProgress(1, "🔍 Recherche du document...", 5);

    const document = await Document.findByPk(documentId, {
      include: [{ model: Section, as: "sections" }],
    });

    if (!document || document.userId !== req.user.id) {
      return res
        .status(404)
        .json({ message: "Document non trouvé ou accès refusé" });
    }

    sendProgress(2, `📄 Document trouvé: ${document.fileName}`, 10);

    const context = document.sections.map((s) => s.content).join("\n\n");

    sendProgress(3, "📊 Analyse de la structure du document...", 15);

    const documentStructure = analyzeDocumentStructure(context);

    // 🔥 DÉTECTION DU TYPE DE DOCUMENT
    let documentType = "general";
    const fileName = document.fileName?.toLowerCase() || "";
    const sampleText = context.substring(0, 500).toLowerCase();

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
    } else {
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

    sendProgress(4, `🔍 Type de document détecté: ${documentType}`, 20);

    const optimalQuestionCount = calculateOptimalQuestionCount(context);

    sendProgress(
      5,
      `🧮 Nombre optimal de questions: ${optimalQuestionCount}`,
      25,
    );

    // 🔥 PASSER LA STRUCTURE AU SERVICE IA
    const aiResult = await aiQuizService.generateQuizFromText(context, {
      questionCount: optimalQuestionCount,
      difficulty,
      documentType: documentType,
      documentStructure,
      onProgress: (progress) => {
        // Relayer la progression du service IA
        sendProgress(
          5 + progress.step,
          progress.message,
          25 + progress.progress * 0.6, // Mapper 0-100% à 25-85%
        );
      },
    });
    sendProgress(11, "✅ Quiz généré, création en base de données...", 90);

    if (!aiResult.questions || aiResult.questions.length === 0) {
      throw new Error("Aucune question valide générée");
    }

    let title = aiResult.title || "";
    if (!title || title.includes("Quiz sur")) {
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
        title = `Quiz - ${document.fileName.replace(/\.[^/.]+$/, "")}`;
      }
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

      await QuizParticipant.create({
        quizId: quiz.id,
        userId: req.user.id,
        isReady: true,
        score: 0,
      });

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
    sendProgress(12, "✅ Quiz prêt et enregistré", 100);
    res.status(201).json({
      success: true,
      message: "Quiz généré avec succès",
      quizId: quiz.id,
      invitationCode,
      questionCount: aiResult.questions.length,
      optimalQuestionCount: optimalQuestionCount,
      mode,
      documentType: documentType,
      documentStats: {
        characters: context.length,
        words: context.split(/\s+/).length,
        sections: document.sections.length,
        hasLists: documentStructure.hasLists,
        hasDates: documentStructure.hasDates,
        hasDefinitions: documentStructure.hasDefinitions,
      },
    });
  } catch (error) {
    console.error("❌ Erreur génération quiz:", error);
    if (global.io) {
      global.io.to(`user_${req.user.id}`).emit("quiz:generation_error", {
        message: error.message || "Erreur lors de la génération",
        timestamp: new Date().toISOString(),
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la génération",
    });
  } finally {
    global.quizGenerationLock = null;
  }
};
// NOUVELLE VERSION (rapide)
const calculateOptimalQuestionCount = (text) => {
  if (!text || text.trim().length === 0) {
    return 3; // Minimum 3 questions
  }

  const wordCount = text.split(/\s+/).filter((w) => w.length > 1).length;

  console.log(`📊 Analyse document: ${wordCount} mots`);

  // 🔥 BEAUCOUP MOINS DE QUESTIONS POUR ALLER PLUS VITE
  if (wordCount < 500) return 3; // Petit document
  if (wordCount < 1000) return 4; // Document moyen
  if (wordCount < 2000) return 5; // Document long
  if (wordCount < 4000) return 6; // Très long document (comme votre PDF)
  return 8; // Maximum 20 questions
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

    const participants = await QuizParticipant.findAll({
      where: { quizId: result.quiz.id },
      include: [{ model: User, as: "user" }],
    });

    if (global.io) {
      global.io.to(`quiz_${result.quiz.id}`).emit("quiz:participants_update", {
        participants: participants.map((p) => ({
          userId: p.userId,
          userName: p.user.userName,
          userPhoto: p.user.userPhoto || "/default-avatar.png",
          isReady: p.isReady,
          score: p.score || 0,
        })),
      });
    }
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

    const quiz = await Quiz.findByPk(id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz non trouvé",
      });
    }

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
