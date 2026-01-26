const { Quiz, Question, QuizParticipant, User } = require("../models");
const { Op } = require("sequelize");

const createQuiz = async (quizData, questions = []) => {
  const quiz = await Quiz.create(quizData);
  const questionPromises = questions.map((q, index) =>
    Question.create({
      quizId: quiz.id,
      text: q.text,
      type: q.type,
      choices: q.choices || [],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || "",
      order: q.order || index + 1,
      points: q.points || 1,
      timeLimit: q.timeLimit || 40,
    }),
  );
  await Promise.all(questionPromises);
  // Ajouter le créateur comme participant si mode solo
  if (quiz.mode === "solo") {
    await QuizParticipant.create({
      quizId: quiz.id, // Ajouter le créateur comme seul participant
      userId: quiz.creatorId,
      isReady: true,
      score: 0,
    });
  }
  return quiz;
};
const joinQuizByCode = async (inviteCode, userId) => {
  const quiz = await Quiz.findOne({
    where: { invitationCode: inviteCode },
    include: [
      {
        model: User,
        as: "creator",
        attributes: ["id", "userName", "userPhoto"],
      },
    ],
  });
  if (!quiz) {
    throw new Error("Quiz introuvable");
  }
  if (quiz.status !== "waiting") {
    throw new Error("Le quiz a déjà commencé");
  }
  // Vérifier si l'utilisateur est déjà participant
  const existing = await QuizParticipant.findOne({
    where: { quizId: quiz.id, userId },
  });
  if (existing) {
    throw new Error("Vous participez déjà à ce quiz");
  }
  // Ajouter comme participant
  const participant = await QuizParticipant.create({
    quizId: quiz.id,
    userId,
    isReady: false,
    score: 0,
  });
  return { quiz, participant };
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
  // Récupérer la première question
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
  // Vérifier si la réponse est correcte
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
  // Calcul du score
  const basePoints = question.points || 1;
  const timeBonus = timeSpent < 10 ? 0.5 : 0;
  const scoreEarned = isCorrect ? basePoints + timeBonus : 0;
  // Enregistrer la réponse
  const quizAnswer = await require("../models").QuizAnswer.create({
    quizId,
    questionId,
    userId,
    answer,
    isCorrect,
    timeSpent,
    score: scoreEarned,
    answeredAt: new Date(),
  });
  // Mettre à jour le score du participant
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

const endQuiz = async (quizId, creatorId) => {
  const quiz = await Quiz.findByPk(quizId);
  if (!quiz || quiz.creatorId !== creatorId) {
    throw new Error("Accès refusé");
  }

  if (quiz.status !== "running") {
    throw new Error("Quiz non en cours");
  }

  // Calculer les scores finaux
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
  // Mettre à jour les positions
  for (let i = 0; i < participants.length; i++) {
    participants[i].position = i + 1;
    await participants[i].save();
  }
  // Mettre à jour le quiz
  quiz.status = "finished";
  quiz.finishedAt = new Date();
  quiz.winnerId = participants[0]?.userId || null;
  await quiz.save();
  // Mettre à jour la progression des utilisateurs
  for (const participant of participants) {
    await updateUserProgress(participant.userId, participant.score);
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

const updateUserProgress = async (userId, score) => {
  const progress = await require("../models").UserProgress.findOne({
    where: { userId },
  });
  if (progress) {
    progress.totalGames += 1;
    progress.totalScore += score;
    progress.averageScore = progress.totalScore / progress.totalGames;
    if (score > progress.bestScore) {
      progress.bestScore = score;
    }
    await progress.save();
  } else {
    await require("../models").UserProgress.create({
      userId,
      totalGames: 1,
      totalScore: score,
      averageScore: score,
      bestScore: score,
    });
  }
};
module.exports = {
  createQuiz,
  joinQuizByCode,
  startQuiz,
  submitAnswer,
  endQuiz,
  updateUserProgress,
};
