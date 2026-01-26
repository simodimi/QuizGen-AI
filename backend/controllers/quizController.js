const {
  Quiz,
  Question,
  Document,
  Section,
  QuizParticipant,
  User,
  Friend,
} = require("../models");
const { Op } = require("sequelize");
const quizService = require("../services/quizService");
const aiQuizService = require("../services/aiQuizService");

const generateQuizFromDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const {
      mode = "solo",
      questionCount = 10,
      difficulty = "medium",
    } = req.body;

    const document = await Document.findByPk(documentId, {
      include: [{ model: Section, as: "sections" }],
    });

    if (!document || document.userId !== req.user.id) {
      return res
        .status(404)
        .json({ message: "Document non trouvé ou accès refusé" });
    }

    const context = document.sections.map((s) => s.content).join("\n\n");
    const aiResult = await aiQuizService.generateQuizFromText(context, {
      questionCount,
      difficulty,
    });

    const quiz = await quizService.createQuiz(
      {
        title: aiResult.title || `Quiz - ${document.fileName}`,
        creatorId: req.user.id,
        documentId: documentId,
        mode: mode,
        difficulty: difficulty,
        questionCount: aiResult.questions.length,
        timeLimit: 40,
        status: "waiting",
        isGeneratedByAI: true,
      },
      aiResult.questions,
    );

    let invitationCode = null;
    if (mode === "multi") {
      invitationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      quiz.invitationCode = invitationCode;
      await quiz.save();
    }

    res.status(201).json({
      success: true,
      message: "Quiz généré avec succès",
      quizId: quiz.id,
      invitationCode,
      questionCount: aiResult.questions.length,
      mode,
    });
  } catch (error) {
    console.error("Erreur génération quiz:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la génération",
    });
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
};
