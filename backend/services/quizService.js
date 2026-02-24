// services/quizService.js
const {
  Quiz,
  Question,
  QuizParticipant,
  User,
} = require("../models/Association");
const UserProgress = require("../models/UserProgress");
const QuizAnswer = require("../models/QuizAnswer");
const { Op } = require("sequelize");

//  Fonction utilitaire pour mélanger un tableau
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const createQuiz = async (quizData, questions = []) => {
  const quiz = await Quiz.create(quizData);

  const questionPromises = questions.map((q, index) => {
    //  Mélanger les options si c'est un QCM
    let choices = q.choices || [];
    if (q.type === "qcm" && choices.length === 4) {
      // Sauvegarder la bonne réponse (inchangée)
      const correctAnswer = q.correctAnswer;

      // Mélanger les options
      choices = shuffleArray(choices);

      // Vérifier que la bonne réponse est toujours dans les options
      if (!choices.includes(correctAnswer)) {
        // Si la bonne réponse a été perdue (cas rare), la remettre aléatoirement
        const randomIndex = Math.floor(Math.random() * 4);
        choices[randomIndex] = correctAnswer;
      }
    }

    return Question.create({
      quizId: quiz.id,
      text: q.text,
      type: q.type,
      choices: choices,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || "",
      order: q.order || index + 1,
      points: q.points || 1,
      timeLimit: q.timeLimit || 40,
    });
  });

  await Promise.all(questionPromises);

  // Ajouter le créateur comme participant si mode solo
  if (quiz.mode === "solo") {
    await QuizParticipant.create({
      quizId: quiz.id,
      userId: quiz.creatorId,
      isReady: true,
      score: 0,
    });
  }

  return quiz;
};

const joinQuizByCode = async (code, userId) => {
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
    throw new Error("Quiz non trouvé");
  }

  if (quiz.status !== "waiting") {
    throw new Error("Ce quiz a déjà démarré ou est terminé");
  }

  const [participant, created] = await QuizParticipant.findOrCreate({
    where: {
      quizId: quiz.id,
      userId: userId,
    },
    defaults: {
      quizId: quiz.id,
      userId: userId,
      isReady: false,
      score: 0,
      joinedAt: new Date(),
    },
  });

  return {
    quiz: {
      id: quiz.id,
      title: quiz.title,
      mode: quiz.mode,
      questionCount: quiz.questionCount,
      creator: quiz.creator,
    },
    participant,
  };
};

const startQuiz = async (quizId, creatorId) => {
  const quiz = await Quiz.findByPk(quizId);
  if (!quiz || quiz.creatorId !== creatorId) {
    throw new Error("Accès refusé");
  }
  if (quiz.status !== "waiting") {
    throw new Error("Quiz déjà démarré");
  }
  quiz.status = "running";
  quiz.startedAt = new Date();
  quiz.currentQuestionIndex = 0;
  await quiz.save();

  const firstQuestion = await Question.findOne({
    where: { quizId },
    order: [["order", "ASC"]],
  });

  return { quiz, firstQuestion };
};

const submitAnswer = async (quizId, questionId, userId, answer, timeSpent) => {
  const question = await Question.findByPk(questionId);

  if (!question || question.quizId !== parseInt(quizId)) {
    throw new Error("Question non valide");
  }

  let isCorrect = false;
  if (question.type === "qcm" || question.type === "multiple") {
    const correctAnswers = Array.isArray(question.correctAnswer)
      ? question.correctAnswer
      : [question.correctAnswer];

    const userAnswers = Array.isArray(answer) ? answer : [answer];
    isCorrect =
      correctAnswers.every((ca) => userAnswers.includes(ca)) &&
      correctAnswers.length === userAnswers.length;
  } else if (question.type === "open") {
    const userAnswer = answer.toString().toLowerCase().trim();
    const correctAnswer = question.correctAnswer
      .toString()
      .toLowerCase()
      .trim();
    isCorrect = userAnswer === correctAnswer;
  }

  const basePoints = question.points || 1;
  const scoreEarned = isCorrect ? basePoints : 0;

  const quizAnswer = await QuizAnswer.create({
    quizId,
    questionId,
    userId,
    answer,
    isCorrect,
    timeSpent,
    score: scoreEarned,
    answeredAt: new Date(),
  });

  const participant = await QuizParticipant.findOne({
    where: { quizId, userId },
  });
  if (participant) {
    participant.score = (participant.score || 0) + scoreEarned;
    participant.lastAnswerAt = new Date();
    await participant.save();
  }

  return {
    quizAnswer,
    isCorrect,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    scoreEarned,
    totalScore: participant?.score || 0,
  };
};

//  NOUVELLE VERSION de updateUserProgress
const updateUserProgress = async (userId, data) => {
  try {
    const { quizId, score, position, totalQuestions, quizType } = data;

    // Calculer le pourcentage
    const percentage =
      totalQuestions > 0
        ? Math.round((score / totalQuestions) * 100 * 100) / 100
        : 0;

    // 1. Créer une entrée d'historique pour ce quiz
    await UserProgress.create({
      userId,
      quizId,
      score,
      position: position || null,
      totalQuestions,
      percentage,
      quizType: quizType || "ia-solo",
      completedAt: new Date(),
      isGlobal: false,
    });

    // 2. Mettre à jour OU créer les statistiques globales
    let globalProgress = await UserProgress.findOne({
      where: {
        userId,
        isGlobal: true,
      },
    });

    if (globalProgress) {
      // Mise à jour des stats existantes
      globalProgress.totalGames += 1;
      globalProgress.totalScore += score;
      globalProgress.averageScore =
        Math.round(
          (globalProgress.totalScore / globalProgress.totalGames) * 100,
        ) / 100;

      if (score > globalProgress.bestScore) {
        globalProgress.bestScore = score;
      }

      await globalProgress.save();
    } else {
      // Création des stats globales
      await UserProgress.create({
        userId,
        isGlobal: true,
        totalGames: 1,
        totalScore: score,
        averageScore: score,
        bestScore: score,
        quizId: null,
      });
    }

    console.log(
      `✅ Progression sauvegardée pour l'utilisateur ${userId}: ${score}/${totalQuestions} (${percentage}%)`,
    );
  } catch (error) {
    console.error("❌ Erreur updateUserProgress:", error);
    throw error;
  }
};

const endQuiz = async (quizId, creatorId) => {
  const quiz = await Quiz.findByPk(quizId);
  if (!quiz || quiz.creatorId !== creatorId) {
    throw new Error("Accès refusé");
  }

  if (quiz.status !== "running") {
    throw new Error("Quiz non en cours");
  }

  const participants = await QuizParticipant.findAll({
    where: { quizId },
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

  for (let i = 0; i < participants.length; i++) {
    participants[i].position = i + 1;
    await participants[i].save();
  }

  quiz.status = "finished";
  quiz.finishedAt = new Date();
  quiz.winnerId = participants[0]?.userId || null;
  await quiz.save();

  //  Sauvegarder la progression pour chaque participant
  const quizType = quiz.mode === "solo" ? "ia-solo" : "ia-multi";

  for (const participant of participants) {
    await updateUserProgress(participant.userId, {
      quizId: quiz.id,
      score: participant.score,
      position: participant.position,
      totalQuestions: quiz.questionCount,
      quizType,
    });
  }

  return {
    quiz,
    finalScores: participants.map((p) => ({
      userId: p.userId,
      userName: p.user.userName,
      userPhoto: p.user.userPhoto,
      score: p.score,
      position: p.position,
    })),
  };
};

//  NOUVELLE FONCTION pour les quizzes classiques (Quiz.tsx)
const saveClassicQuizResult = async (userId, data) => {
  try {
    const { score, totalQuestions = 10, theme } = data;

    // 1. Créer un quiz "classique" dans la table Quiz
    const quiz = await Quiz.create({
      title: `Quiz classique - ${theme}`,
      creatorId: userId,
      mode: "solo",
      questionCount: totalQuestions,
      status: "finished",
      theme: theme,
      isPredefined: true,
      startedAt: new Date(),
      finishedAt: new Date(),
    });

    // 2. Créer une participation
    await QuizParticipant.create({
      quizId: quiz.id,
      userId: userId,
      score: score,
      position: 1,
      isReady: true,
    });

    // 3. Sauvegarder dans UserProgress
    await updateUserProgress(userId, {
      quizId: quiz.id,
      score,
      position: 1,
      totalQuestions,
      quizType: "classic",
    });

    return { success: true, quizId: quiz.id };
  } catch (error) {
    console.error("❌ Erreur saveClassicQuizResult:", error);
    throw error;
  }
};

// Ajouter cette fonction dans quizService.js
const enhanceQuizQuestions = (questions) => {
  return questions.map((q) => {
    if (q.type === "qcm" && q.choices && q.choices.length === 4) {
      // Analyser les options pour s'assurer qu'elles sont pertinentes
      const options = [...q.choices];
      const correctIndex = options.indexOf(q.correctAnswer);

      // Si la bonne réponse n'est pas trouvée, la remettre
      if (correctIndex === -1) {
        options[Math.floor(Math.random() * 4)] = q.correctAnswer;
      }

      // S'assurer qu'il y a une option piège (similaire à la bonne)
      const similarOption = options.find(
        (opt) =>
          opt !== q.correctAnswer &&
          (opt.includes(q.correctAnswer.substring(0, 10)) ||
            q.correctAnswer.includes(opt.substring(0, 10))),
      );

      // Si pas d'option piège, en créer une
      if (!similarOption) {
        const trapOption = q.correctAnswer + " (inversé)";
        options[options.indexOf(q.correctAnswer) === 0 ? 1 : 0] = trapOption;
      }

      return {
        ...q,
        choices: shuffleArray(options),
      };
    }
    return q;
  });
};

module.exports = {
  createQuiz,
  joinQuizByCode,
  startQuiz,
  submitAnswer,
  endQuiz,
  updateUserProgress,
  saveClassicQuizResult,
  enhanceQuizQuestions,
};
