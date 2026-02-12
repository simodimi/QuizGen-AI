/*const {
  Quiz,
  Question,
  QuizParticipant,
  QuizAnswer,
  User,
} = require("../models/Association");

const activeQuizzes = new Map();

module.exports = (io, socket) => {
  const userId = socket.handshake.query.userId;
  if (userId) {
    socket.userId = parseInt(userId);
    socket.userName = socket.handshake.query.userName || "Utilisateur";
  }
 

  socket.on("quiz:invite_friends", async ({ quizId, friendIds }) => {
    try {
      const quiz = await Quiz.findByPk(quizId);
      if (!quiz || quiz.creatorId !== socket.userId) return;

      friendIds.forEach((friendId) => {
        io.to(`user_${friendId}`).emit("quiz:invitation", {
          quizId,
          quizTitle: quiz.title,
          invitationCode: quiz.invitationCode,
          fromUserId: socket.userId,
          fromUserName: socket.userName,
          createdAt: new Date(),
        });
      });

      socket.emit("quiz:friends_invited", { count: friendIds.length });
    } catch (err) {
      console.error("Erreur quiz:invite_friends", err);
    }
  });



  socket.on("quiz:join_by_code", async ({ invitationCode }) => {
    try {
      const quiz = await Quiz.findOne({
        where: { invitationCode, status: "waiting" },
      });

      if (!quiz) {
        socket.emit("quiz:join_error", { message: "Quiz introuvable" });
        return;
      }

      socket.join(`quiz_${quiz.id}`);

      const existing = await QuizParticipant.findOne({
        where: { quizId: quiz.id, userId: socket.userId },
      });

      if (!existing) {
        await QuizParticipant.create({
          quizId: quiz.id,
          userId: socket.userId,
          isReady: false,
          score: 0,
        });
      }

      const participants = await QuizParticipant.findAll({
        where: { quizId: quiz.id },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "userName", "userPhoto"],
          },
        ],
      });

      io.to(`quiz_${quiz.id}`).emit("quiz:waiting_room_update", {
        participants,
        allReady: participants.every((p) => p.isReady),
      });

      socket.emit("quiz:joined", { quizId: quiz.id, title: quiz.title });
    } catch (err) {
      console.error("Erreur quiz:join_by_code", err);
    }
  });


  socket.on("quiz:multi_ready", async ({ quizId }) => {
    try {
      const quiz = await Quiz.findByPk(quizId);

      const participant = await QuizParticipant.findOne({
        where: { quizId, userId: socket.userId },
      });

      if (!participant) return;

      participant.isReady = true;
      await participant.save();

      const participants = await QuizParticipant.findAll({
        where: { quizId },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "userName", "userPhoto"],
          },
        ],
      });

      const allReady = participants.every((p) => p.isReady);

      io.to(`quiz_${quizId}`).emit("quiz:waiting_room_update", {
        participants,
        allReady,
      });

      if (allReady) {
        io.to(`user_${quiz.creatorId}`).emit("quiz:can_start", {
          quizId,
          canStart: true,
        });
      }
    } catch (err) {
      console.error("Erreur quiz:multi_ready", err);
    }
  });


  socket.on("quiz:multi_start", async ({ quizId }) => {
    try {
      socket.join(`quiz_${quizId}`);

      const quiz = await Quiz.findByPk(quizId, {
        include: [
          { model: Question, as: "questions", order: [["order", "ASC"]] },
        ],
      });

      if (!quiz || quiz.creatorId !== socket.userId) return;

      const notReady = await QuizParticipant.count({
        where: { quizId, isReady: false },
      });

      if (notReady > 0) {
        socket.emit("quiz:start_error", {
          message: "Tous les participants ne sont pas prêts",
        });
        return;
      }

      quiz.status = "running";
      quiz.startedAt = new Date();
      quiz.currentQuestionIndex = 0;
      await quiz.save();

      const questions = quiz.questions.map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        choices: q.choices || [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        points: q.points || 1,
        timeLimit: q.timeLimit || 40,
      }));

      activeQuizzes.set(quizId, {
        questions,
        currentQuestionIndex: 0,
        participants: new Map(),
        answers: new Map(),
        timers: new Map(),
        startTime: Date.now(),
      });

      io.to(`quiz_${quizId}`).emit("quiz:question_start", {
        question: questions[0],
        questionNumber: 1,
        totalQuestions: questions.length,
        timeLimit: questions[0].timeLimit,
      });

      startQuestionTimer(io, quizId, questions[0].id, questions[0].timeLimit);
    } catch (err) {
      console.error("Erreur quiz:multi_start", err);
    }
  });



  socket.on("quiz:multi_answer", async ({ quizId, questionId, answer }) => {
    try {
      const quizState = activeQuizzes.get(quizId);
      if (!quizState) return;

      const question = quizState.questions[quizState.currentQuestionIndex];
      if (!question || question.id !== questionId) return;

      const timeSpent = Math.floor((Date.now() - quizState.startTime) / 1000);

      quizState.answers.set(socket.userId, { answer, timeSpent });

      const participants = await QuizParticipant.findAll({ where: { quizId } });

      if (quizState.answers.size >= participants.length) {
        await evaluateAnswers(io, quizId, quizState);
      }
      if (quizState.answers.has(socket.userId)) return;
    } catch (err) {
      console.error("Erreur quiz:multi_answer", err);
    }
  });
};


function startQuestionTimer(io, quizId, questionId, duration) {
  const timer = setTimeout(async () => {
    const quizState = activeQuizzes.get(quizId);
    if (!quizState) return;

    await evaluateAnswers(io, quizId, quizState);

    io.to(`quiz_${quizId}`).emit("quiz:time_up", { questionId });
  }, duration * 1000);

  const quizState = activeQuizzes.get(quizId);
  if (quizState) quizState.timers.set(`question_${questionId}`, timer);
}


async function evaluateAnswers(io, quizId, quizState) {
  const question = quizState.questions[quizState.currentQuestionIndex];

  const participants = await QuizParticipant.findAll({
    where: { quizId },
    include: [
      { model: User, as: "user", attributes: ["id", "userName", "userPhoto"] },
    ],
  });

  const results = [];

  for (const participant of participants) {
    const userAnswer = quizState.answers.get(participant.userId);
    let isCorrect = false;

    if (userAnswer) {
      if (question.type === "qcm") {
        isCorrect = userAnswer.answer === question.correctAnswer;
      } else if (question.type === "multiple") {
        const ua = Array.isArray(userAnswer.answer)
          ? userAnswer.answer
          : [userAnswer.answer];
        const ca = Array.isArray(question.correctAnswer)
          ? question.correctAnswer
          : [question.correctAnswer];
        isCorrect = ua.length === ca.length && ua.every((v) => ca.includes(v));
      }

      const score = isCorrect ? question.points : 0;

      participant.score += score;
      participant.lastAnswerAt = new Date();
      await participant.save();

      results.push({
        userId: participant.userId,
        userName: participant.user.userName,
        userPhoto: participant.user.userPhoto,
        isCorrect,
        scoreEarned: score,
        totalScore: participant.score,
        timeSpent: userAnswer.timeSpent,
      });
    }
  }

  results.sort(
    (a, b) => b.totalScore - a.totalScore || a.timeSpent - b.timeSpent,
  );

  io.to(`quiz_${quizId}`).emit("quiz:question_results", {
    questionId: question.id,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    leaderboard: results,
  });

  quizState.currentQuestionIndex++;
  quizState.answers.clear();
  quizState.startTime = Date.now();

  if (quizState.currentQuestionIndex >= quizState.questions.length) {
    io.to(`quiz_${quizId}`).emit("quiz:ended", { leaderboard: results });
    activeQuizzes.delete(quizId);
    return;
  }

  const nextQuestion = quizState.questions[quizState.currentQuestionIndex];

  io.to(`quiz_${quizId}`).emit("quiz:question_start", {
    question: nextQuestion,
    questionNumber: quizState.currentQuestionIndex + 1,
    totalQuestions: quizState.questions.length,
    timeLimit: nextQuestion.timeLimit,
  });

  startQuestionTimer(io, quizId, nextQuestion.id, nextQuestion.timeLimit);
}
*/
