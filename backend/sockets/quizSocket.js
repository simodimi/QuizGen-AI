const {
  Quiz,
  Question,
  QuizParticipant,
  QuizAnswer,
  User,
} = require("../models");

const activeQuizzes = new Map();

module.exports = (io, socket) => {
  // Rejoindre un quiz avec code
  socket.on("quiz:join", async ({ inviteCode }) => {
    try {
      const quiz = await Quiz.findOne({
        where: { invitationCode: inviteCode, status: "waiting" },
      });

      if (!quiz) {
        socket.emit("quiz:join_error", {
          message: "Quiz introuvable ou déjà commencé",
        });
        return;
      }

      // Vérifier si déjà participant
      const existing = await QuizParticipant.findOne({
        where: { quizId: quiz.id, userId: socket.userId },
      });

      if (existing) {
        socket.emit("quiz:join_error", { message: "Vous participez déjà" });
        return;
      }

      // Ajouter comme participant
      const participant = await QuizParticipant.create({
        quizId: quiz.id,
        userId: socket.userId,
        isReady: false,
        score: 0,
      });

      // Rejoindre la room du quiz
      socket.join(`quiz_${quiz.id}`);

      // Récupérer les infos utilisateur
      const user = await User.findByPk(socket.userId, {
        attributes: ["id", "userName", "userPhoto"],
      });

      // Informer tous les participants
      io.to(`quiz_${quiz.id}`).emit("quiz:player_joined", {
        userId: socket.userId,
        userName: user.userName,
        userPhoto: user.userPhoto,
        participantId: participant.id,
        totalParticipants: await QuizParticipant.count({
          where: { quizId: quiz.id },
        }),
      });

      // Informer le créateur spécifiquement
      if (quiz.creatorId !== socket.userId) {
        io.to(`user_${quiz.creatorId}`).emit("quiz:new_participant", {
          userId: socket.userId,
          userName: user.userName,
          quizId: quiz.id,
          quizTitle: quiz.title,
        });
      }

      socket.emit("quiz:joined", {
        quizId: quiz.id,
        title: quiz.title,
        creatorId: quiz.creatorId,
        mode: quiz.mode,
        participantId: participant.id,
      });
    } catch (error) {
      console.error("Erreur quiz:join:", error);
      socket.emit("quiz:join_error", { message: "Erreur serveur" });
    }
  });

  // Marquer comme prêt
  socket.on("quiz:ready", async ({ quizId }) => {
    try {
      const participant = await QuizParticipant.findOne({
        where: { quizId, userId: socket.userId },
      });

      if (!participant) return;

      participant.isReady = true;
      await participant.save();

      // Informer tous les participants
      io.to(`quiz_${quizId}`).emit("quiz:player_ready", {
        userId: socket.userId,
        isReady: true,
      });

      // Vérifier si tous sont prêts
      const notReadyCount = await QuizParticipant.count({
        where: { quizId, isReady: false },
      });

      if (notReadyCount === 0) {
        io.to(`quiz_${quizId}`).emit("quiz:all_ready", { quizId });
        io.to(`user_${socket.userId}`).emit("quiz:can_start", { quizId });
      }
    } catch (error) {
      console.error("Erreur quiz:ready:", error);
    }
  });

  // Lancer le quiz (créateur uniquement)
  socket.on("quiz:start", async ({ quizId }) => {
    try {
      const quiz = await Quiz.findByPk(quizId);

      if (!quiz || quiz.creatorId !== socket.userId) {
        socket.emit("quiz:start_error", { message: "Accès refusé" });
        return;
      }

      if (quiz.status !== "waiting") {
        socket.emit("quiz:start_error", { message: "Quiz déjà démarré" });
        return;
      }

      // Récupérer les questions
      const questions = await Question.findAll({
        where: { quizId },
        order: [["order", "ASC"]],
      });

      // Initialiser l'état du quiz
      activeQuizzes.set(quizId, {
        questions,
        currentQuestionIndex: 0,
        participants: new Map(),
        timers: new Map(),
      });

      // Mettre à jour le statut
      quiz.status = "running";
      quiz.startedAt = new Date();
      quiz.currentQuestionIndex = 0;
      await quiz.save();

      // Envoyer la première question
      const firstQuestion = questions[0];
      io.to(`quiz_${quizId}`).emit("quiz:question", {
        questionId: firstQuestion.id,
        text: firstQuestion.text,
        type: firstQuestion.type,
        choices: firstQuestion.choices || [],
        order: firstQuestion.order,
        totalQuestions: questions.length,
        timeLimit: firstQuestion.timeLimit || 40,
        questionIndex: 1,
      });

      // Démarrer le timer
      startQuestionTimer(
        io,
        quizId,
        firstQuestion.id,
        firstQuestion.timeLimit || 40,
      );
    } catch (error) {
      console.error("Erreur quiz:start:", error);
      socket.emit("quiz:start_error", { message: "Erreur serveur" });
    }
  });

  // Soumettre une réponse
  socket.on(
    "quiz:answer",
    async ({ quizId, questionId, answer, timeSpent }) => {
      try {
        const quizState = activeQuizzes.get(quizId);
        if (!quizState) return;

        const question = quizState.questions[quizState.currentQuestionIndex];
        if (!question || question.id !== questionId) return;

        // Vérifier la réponse
        let isCorrect = false;

        if (question.type === "qcm" || question.type === "multiple") {
          const correctAnswers = Array.isArray(question.correctAnswer)
            ? question.correctAnswer
            : [question.correctAnswer];

          const userAnswers = Array.isArray(answer) ? answer : [answer];

          isCorrect =
            correctAnswers.every((ca) => userAnswers.includes(ca)) &&
            correctAnswers.length === userAnswers.length;
        }

        // Calculer le score
        const basePoints = 1;
        const timeBonus = timeSpent < 10 ? 0.5 : 0;
        const scoreEarned = isCorrect ? basePoints + timeBonus : 0;

        // Mettre à jour l'état
        if (!quizState.participants.has(socket.userId)) {
          quizState.participants.set(socket.userId, { score: 0, totalTime: 0 });
        }

        const participant = quizState.participants.get(socket.userId);
        if (isCorrect) {
          participant.score += scoreEarned;
          participant.totalTime += timeSpent;
        }

        // Enregistrer en base
        await QuizAnswer.create({
          quizId,
          questionId,
          userId: socket.userId,
          answer,
          isCorrect,
          timeSpent,
          score: scoreEarned,
          answeredAt: new Date(),
        });

        // Mettre à jour le participant
        await QuizParticipant.update(
          {
            score: participant.score,
            lastAnswerAt: new Date(),
          },
          { where: { quizId, userId: socket.userId } },
        );

        // Informer l'utilisateur
        socket.emit("quiz:answer_result", {
          questionId,
          isCorrect,
          scoreEarned,
          totalScore: participant.score,
        });

        // Vérifier si tous ont répondu
        const totalParticipants = await QuizParticipant.count({
          where: { quizId },
        });
        const answeredCount = Array.from(quizState.participants.keys()).length;

        if (answeredCount >= totalParticipants) {
          // Tous ont répondu, passer à la question suivante
          await nextQuestion(io, quizId);
        }
      } catch (error) {
        console.error("Erreur quiz:answer:", error);
      }
    },
  );

  // Inviter un ami à un quiz
  socket.on("quiz:invite", async ({ quizId, friendId }) => {
    try {
      const quiz = await Quiz.findByPk(quizId);

      if (!quiz || quiz.creatorId !== socket.userId) {
        socket.emit("quiz:invite_error", { message: "Accès refusé" });
        return;
      }

      // Vérifier l'amitié
      const friendship = await require("../models").Friend.findOne({
        where: {
          status: "accepter",
          [require("sequelize").Op.or]: [
            { requesterId: socket.userId, receiverId: friendId },
            { requesterId: friendId, receiverId: socket.userId },
          ],
        },
      });

      if (!friendship) {
        socket.emit("quiz:invite_error", { message: "Vous n'êtes pas amis" });
        return;
      }

      // Envoyer l'invitation
      io.to(`user_${friendId}`).emit("quiz:invitation", {
        quizId,
        quizTitle: quiz.title,
        invitationCode: quiz.invitationCode,
        fromUserId: socket.userId,
        fromUserName: socket.userName,
        createdAt: new Date(),
      });

      socket.emit("quiz:invite_sent", { friendId });
    } catch (error) {
      console.error("Erreur quiz:invite:", error);
      socket.emit("quiz:invite_error", { message: "Erreur serveur" });
    }
  });
};

function startQuestionTimer(io, quizId, questionId, duration) {
  const timer = setTimeout(async () => {
    await nextQuestion(io, quizId);
  }, duration * 1000);

  const quizState = activeQuizzes.get(quizId);
  if (quizState) {
    quizState.timers.set(`question_${questionId}`, timer);
  }
}

async function nextQuestion(io, quizId) {
  const quizState = activeQuizzes.get(quizId);
  if (!quizState) return;

  // Annuler le timer actuel
  const currentQuestion = quizState.questions[quizState.currentQuestionIndex];
  if (currentQuestion) {
    const timerKey = `question_${currentQuestion.id}`;
    if (quizState.timers.has(timerKey)) {
      clearTimeout(quizState.timers.get(timerKey));
      quizState.timers.delete(timerKey);
    }
  }

  quizState.currentQuestionIndex++;

  // Envoyer le classement intermédiaire
  const leaderboard = Array.from(quizState.participants.entries())
    .map(([userId, data]) => ({ userId, ...data }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.totalTime - b.totalTime;
    });

  io.to(`quiz_${quizId}`).emit("quiz:leaderboard", {
    leaderboard,
    questionIndex: quizState.currentQuestionIndex,
  });

  // Vérifier si c'est la fin du quiz
  if (quizState.currentQuestionIndex >= quizState.questions.length) {
    // Fin du quiz
    await endQuiz(io, quizId, quizState);
    activeQuizzes.delete(quizId);
    return;
  }

  // Envoyer la question suivante
  const nextQuestion = quizState.questions[quizState.currentQuestionIndex];
  io.to(`quiz_${quizId}`).emit("quiz:question", {
    questionId: nextQuestion.id,
    text: nextQuestion.text,
    type: nextQuestion.type,
    choices: nextQuestion.choices || [],
    order: nextQuestion.order,
    totalQuestions: quizState.questions.length,
    timeLimit: nextQuestion.timeLimit || 40,
    questionIndex: quizState.currentQuestionIndex + 1,
  });

  // Démarrer le timer pour la nouvelle question
  startQuestionTimer(io, quizId, nextQuestion.id, nextQuestion.timeLimit || 40);
}

async function endQuiz(io, quizId, quizState) {
  try {
    const quiz = await Quiz.findByPk(quizId);

    // Mettre à jour le quiz
    quiz.status = "finished";
    quiz.finishedAt = new Date();
    quiz.currentQuestionIndex = quizState.questions.length;
    await quiz.save();

    // Calculer le classement final
    const finalParticipants = await QuizParticipant.findAll({
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
    for (let i = 0; i < finalParticipants.length; i++) {
      finalParticipants[i].position = i + 1;
      await finalParticipants[i].save();
    }

    const finalLeaderboard = finalParticipants.map((p) => ({
      userId: p.userId,
      userName: p.user.userName,
      userPhoto: p.user.userPhoto,
      score: p.score,
      position: p.position,
      isReady: p.isReady,
    }));

    // Envoyer les résultats finaux
    io.to(`quiz_${quizId}`).emit("quiz:end", {
      quizId,
      leaderboard: finalLeaderboard,
      winner: finalLeaderboard[0],
      finishedAt: quiz.finishedAt,
    });

    // Mettre à jour la progression des utilisateurs
    for (const participant of finalParticipants) {
      await require("../services/quizService").updateUserProgress(
        participant.userId,
        participant.score,
      );
    }
  } catch (error) {
    console.error("Erreur endQuiz:", error);
  }
}
