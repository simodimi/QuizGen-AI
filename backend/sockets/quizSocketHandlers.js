const {
  Quiz,
  Question,
  QuizParticipant,
  User,
  QuizAnswer,
  Document,
  UserProgress,
} = require("../models/Association");

const activeQuizzes = new Map();

const setupQuizSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    console.log(`🔌 Socket quiz connecté: ${socket.id}`);

    const userId = socket.handshake.query.userId;
    if (userId) {
      socket.userId = parseInt(userId);

      User.findByPk(socket.userId, {
        attributes: ["id", "userName", "userPhoto"],
      }).then((user) => {
        if (user) {
          socket.userName = user.userName;
          socket.userPhoto = user.userPhoto;
        }
      });
    }

    socket.on("join_user_room", (userId) => {
      socket.join(`user_${userId}`);
      console.log(`✅ Socket ${socket.id} rejoint user_${userId}`);
    });

    socket.on("join_quiz_room", ({ quizId }) => {
      if (quizId) {
        socket.join(`quiz_${quizId}`);
        console.log(`🏠 Socket ${socket.id} a rejoint room quiz_${quizId}`);
      }
    });
    // ✅ VERSION ROBUSTE AVEC findOrCreate
    socket.on("quiz:join_by_code", async ({ invitationCode }) => {
      try {
        const quiz = await Quiz.findOne({
          where: { invitationCode, status: "waiting" },
          include: [{ model: Document, as: "document" }],
        });

        if (!quiz) {
          socket.emit("quiz:join_error", {
            message: "Quiz introuvable ou déjà démarré",
          });
          return;
        }

        socket.join(`quiz_${quiz.id}`);

        // 🔥 SOLUTION ULTIME : findOrCreate (maintenant protégé par la contrainte unique)
        const [participant, created] = await QuizParticipant.findOrCreate({
          where: {
            quizId: quiz.id,
            userId: socket.userId,
          },
          defaults: {
            quizId: quiz.id,
            userId: socket.userId,
            isReady: false,
            score: 0,
            joinedAt: new Date(),
          },
        });
        // ✅ NOUVEAU : Partager le document avec le participant
        if (quiz.documentId) {
          const SharedDocument = require("../models/SharedDocument");
          await SharedDocument.findOrCreate({
            where: {
              documentId: quiz.documentId,
              sharedWithId: socket.userId,
            },
            defaults: {
              documentId: quiz.documentId,
              ownerId: quiz.creatorId,
              sharedWithId: socket.userId,
              sharedViaQuizId: quiz.id,
              sharedAt: new Date(),
            },
          });
          console.log(
            `📤 Document partagé avec le participant ${socket.userId}`,
          );
        }
        console.log(
          `✅ Participant ${created ? "créé" : "existait"} pour quiz ${quiz.id}`,
        );

        // Récupérer les participants (maintenant sans doublons grâce à la contrainte)
        const participants = await QuizParticipant.findAll({
          where: { quizId: quiz.id },
          include: [
            {
              model: User,
              as: "user",
              attributes: ["iduser", "userName", "userPhoto"], // Note: c'est "iduser" dans ta table users !
            },
          ],
        });

        const formattedParticipants = participants.map((p) => ({
          userId: p.userId,
          userName: p.user.userName,
          userPhoto: p.user.userPhoto || "/default-avatar.png",
          isReady: p.isReady,
          score: p.score || 0,
        }));

        // Émettre la liste propre
        io.to(`quiz_${quiz.id}`).emit("quiz:participants_update", {
          participants: formattedParticipants,
        });

        // Infos du quiz
        socket.emit("quiz:quiz_info", {
          quizId: quiz.id,
          title: quiz.title,
          creatorId: quiz.creatorId,
          questionCount: quiz.questionCount,
        });

        socket.emit("quiz:joined", {
          quizId: quiz.id,
          title: quiz.title,
          creatorId: quiz.creatorId,
          isCreator: quiz.creatorId === socket.userId,
        });
        if (quiz.documentId) {
          const SharedDocument = require("../models/SharedDocument");
          await SharedDocument.findOrCreate({
            where: {
              documentId: quiz.documentId,
              sharedWithId: socket.userId,
            },
            defaults: {
              documentId: quiz.documentId,
              ownerId: quiz.creatorId,
              sharedWithId: socket.userId,
              sharedViaQuizId: quiz.id,
              sharedAt: new Date(),
            },
          });
        }
      } catch (error) {
        // Si erreur de duplication (normalement plus possible avec la contrainte)
        if (error.name === "SequelizeUniqueConstraintError") {
          console.log("⚠️ Tentative de double inscription bloquée");
          return;
        }

        console.error("❌ Erreur:", error);
        socket.emit("quiz:join_error", {
          message: "Erreur serveur",
        });
      }
    });
    // ✅ MARQUER COMME PRÊT
    socket.on("quiz:player_ready", async ({ quizId }) => {
      try {
        await QuizParticipant.update(
          { isReady: true },
          { where: { quizId, userId: socket.userId } },
        );

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

        const formattedParticipants = participants.map((p) => ({
          userId: p.userId,
          userName: p.user.userName,
          userPhoto: p.user.userPhoto || "/default-avatar.png",
          isReady: p.isReady,
          score: p.score || 0,
        }));

        // ✅ ÉMETTRE À TOUS DANS LA ROOM
        io.to(`quiz_${quizId}`).emit("quiz:player_ready", {
          userId: socket.userId,
          participants: formattedParticipants,
        });

        io.to(`quiz_${quizId}`).emit("quiz:waiting_room_update", {
          participants: formattedParticipants,
        });
      } catch (error) {
        console.error("❌ Erreur quiz:player_ready:", error);
      }
    });

    // ✅ DÉMARRER LE QUIZ
    socket.on("quiz:multi_start", async ({ quizId }) => {
      try {
        const quiz = await Quiz.findByPk(quizId, {
          include: [
            {
              model: Question,
              as: "questions",
              order: [["order", "ASC"]],
            },
          ],
        });

        if (!quiz || quiz.creatorId !== socket.userId) {
          socket.emit("quiz:start_error", {
            message: "Seul le créateur peut démarrer le quiz",
          });
          return;
        }

        // ✅ S'assurer que le créateur est dans la room
        socket.join(`quiz_${quizId}`);

        const readyCount = await QuizParticipant.count({
          where: { quizId, isReady: true },
        });

        if (readyCount < 2) {
          socket.emit("quiz:start_error", {
            message: "Au moins 2 joueurs doivent être prêts",
          });
          return;
        }

        quiz.status = "running";
        quiz.startedAt = new Date();
        quiz.currentQuestionIndex = 0;
        await quiz.save();

        // Préparer les questions
        const questions = quiz.questions.map((q) => ({
          id: q.id,
          text: q.text,
          type: q.type,
          choices: q.choices || [],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          points: q.points || 1,
          timeLimit: q.timeLimit || 40,
          order: q.order,
        }));

        activeQuizzes.set(quizId, {
          questions,
          currentQuestionIndex: 0,
          answers: new Map(),
          startTime: Date.now(),
        });

        // ✅ PREMIÈRE QUESTION - ENVOYER À TOUTE LA ROOM
        const firstQuestion = questions[0];
        const questionForClients = {
          id: firstQuestion.id,
          text: firstQuestion.text,
          type: firstQuestion.type,
          choices: firstQuestion.choices,
          points: firstQuestion.points,
          timeLimit: firstQuestion.timeLimit,
          order: firstQuestion.order,
        };

        io.to(`quiz_${quizId}`).emit("quiz:question_start", {
          question: questionForClients,
          questionNumber: 1,
          totalQuestions: questions.length,
          timeLimit: firstQuestion.timeLimit,
        });

        // Démarrer le timer
        startQuestionTimer(
          io,
          quizId,
          firstQuestion.id,
          firstQuestion.timeLimit,
        );

        console.log(`🎮 Quiz ${quizId} démarré - Question 1 envoyée`);
      } catch (error) {
        console.error("❌ Erreur quiz:multi_start:", error);
      }
    });

    // ✅ SOUMETTRE UNE RÉPONSE
    socket.on("quiz:multi_answer", async ({ quizId, questionId, answer }) => {
      try {
        const quizState = activeQuizzes.get(quizId);
        if (!quizState) return;

        const currentQuestion =
          quizState.questions[quizState.currentQuestionIndex];
        if (!currentQuestion || currentQuestion.id !== questionId) return;

        // Éviter les doubles soumissions
        if (quizState.answers.has(socket.userId)) return;

        const timeSpent = Math.floor((Date.now() - quizState.startTime) / 1000);

        // Évaluer
        let isCorrect = false;
        if (currentQuestion.type === "qcm") {
          isCorrect = answer === currentQuestion.correctAnswer;
        } else if (currentQuestion.type === "multiple") {
          const userAnswers = Array.isArray(answer) ? answer : [answer];
          const correctAnswers = Array.isArray(currentQuestion.correctAnswer)
            ? currentQuestion.correctAnswer
            : [currentQuestion.correctAnswer];

          isCorrect =
            userAnswers.length === correctAnswers.length &&
            userAnswers.every((a) => correctAnswers.includes(a));
        }

        const score = isCorrect ? currentQuestion.points : 0;

        // Stocker la réponse
        quizState.answers.set(socket.userId, {
          answer,
          timeSpent,
          isCorrect,
          score,
        });

        // Mettre à jour le score
        const participant = await QuizParticipant.findOne({
          where: { quizId, userId: socket.userId },
        });

        if (participant) {
          participant.score = (participant.score || 0) + score;
          participant.lastAnswerAt = new Date();
          await participant.save();
        }

        await QuizAnswer.create({
          quizId,
          questionId,
          userId: socket.userId,
          answer,
          isCorrect,
          timeSpent,
          score,
          answeredAt: new Date(),
        });

        // ✅ Récupérer tous les participants avec leurs scores
        const allParticipants = await QuizParticipant.findAll({
          where: { quizId },
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "userName", "userPhoto"],
            },
          ],
          order: [["score", "DESC"]],
        });

        const leaderboard = allParticipants.map((p) => ({
          userId: p.userId,
          userName: p.user.userName,
          userPhoto: p.user.userPhoto || "/default-avatar.png",
          score: p.score || 0,
        }));

        // ✅ ENVOYER LE RÉSULTAT INDIVIDUEL
        socket.emit("quiz:answer_result", {
          isCorrect,
          scoreEarned: score,
          totalScore: participant?.score || 0,
          correctAnswer: currentQuestion.correctAnswer,
          explanation: currentQuestion.explanation,
        });

        // ✅ ENVOYER LE CLASSEMENT À TOUS
        io.to(`quiz_${quizId}`).emit("quiz:leaderboard_update", {
          leaderboard,
          questionId,
        });
      } catch (error) {
        console.error("❌ Erreur quiz:multi_answer:", error);
      }
    });

    // ✅ AFFICHER LA CORRECTION AUTOMATIQUEMENT
    socket.on("quiz:show_correction", async ({ quizId }) => {
      try {
        const quiz = await Quiz.findByPk(quizId);
        if (!quiz || quiz.creatorId !== socket.userId) {
          socket.emit("quiz:show_correction_error", {
            message: "Seul le créateur peut afficher la correction",
          });
          return;
        }

        const quizState = activeQuizzes.get(quizId);
        if (!quizState) return;

        const currentQuestion =
          quizState.questions[quizState.currentQuestionIndex];

        // Évaluer les réponses manquantes
        await evaluateMissingAnswers(io, quizId, quizState);

        // Récupérer les scores à jour
        const participants = await QuizParticipant.findAll({
          where: { quizId },
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "userName", "userPhoto"],
            },
          ],
          order: [["score", "DESC"]],
        });

        const leaderboard = participants.map((p) => ({
          userId: p.userId,
          userName: p.user.userName,
          userPhoto: p.user.userPhoto || "/default-avatar.png",
          score: p.score || 0,
        }));

        // ✅ ENVOYER LA CORRECTION À TOUS
        io.to(`quiz_${quizId}`).emit("quiz:show_correction", {
          questionId: currentQuestion.id,
          correctAnswer: currentQuestion.correctAnswer,
          explanation: currentQuestion.explanation,
          leaderboard,
        });

        console.log(`📢 Correction affichée pour quiz ${quizId}`);
      } catch (error) {
        console.error("❌ Erreur quiz:show_correction:", error);
      }
    });

    // ✅ PASSER À LA QUESTION SUIVANTE
    socket.on("quiz:next_question", async ({ quizId }) => {
      try {
        const quiz = await Quiz.findByPk(quizId);
        if (!quiz || quiz.creatorId !== socket.userId) {
          socket.emit("quiz:next_question_error", {
            message: "Seul le créateur peut passer à la question suivante",
          });
          return;
        }

        const quizState = activeQuizzes.get(quizId);
        if (!quizState) return;

        // Incrémenter l'index
        quizState.currentQuestionIndex++;
        quizState.answers.clear();
        quizState.startTime = Date.now();

        // Vérifier si c'est la fin
        if (quizState.currentQuestionIndex >= quizState.questions.length) {
          await endQuiz(io, quizId, quizState);
          return;
        }

        // ✅ PROCHAINE QUESTION
        const nextQuestion =
          quizState.questions[quizState.currentQuestionIndex];
        const questionForClients = {
          id: nextQuestion.id,
          text: nextQuestion.text,
          type: nextQuestion.type,
          choices: nextQuestion.choices,
          points: nextQuestion.points,
          timeLimit: nextQuestion.timeLimit,
          order: nextQuestion.order,
        };

        // ✅ ENVOYER À TOUS
        io.to(`quiz_${quizId}`).emit("quiz:question_start", {
          question: questionForClients,
          questionNumber: quizState.currentQuestionIndex + 1,
          totalQuestions: quizState.questions.length,
          timeLimit: nextQuestion.timeLimit,
        });

        // Démarrer le timer
        startQuestionTimer(io, quizId, nextQuestion.id, nextQuestion.timeLimit);

        console.log(
          `⏩ Quiz ${quizId} - Question ${quizState.currentQuestionIndex + 1}`,
        );
      } catch (error) {
        console.error("❌ Erreur quiz:next_question:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log(
        `🔌 Socket déconnecté: ${socket.id} (User: ${socket.userId})`,
      );
    });
    socket.on("quiz:confirm_generation", async ({ quizId }) => {
      try {
        const quiz = await Quiz.findByPk(quizId);
        if (quiz) {
          socket.emit("quiz:generation_confirmed", {
            quizId: quiz.id,
            title: quiz.title,
            invitationCode: quiz.invitationCode,
            questionCount: quiz.questionCount,
          });
        }
      } catch (error) {
        console.error("❌ Erreur confirmation génération:", error);
      }
    });
  });
};

// ✅ ÉVALUER LES RÉPONSES MANQUANTES
async function evaluateMissingAnswers(io, quizId, quizState) {
  try {
    const question = quizState.questions[quizState.currentQuestionIndex];

    const participants = await QuizParticipant.findAll({
      where: { quizId },
    });

    for (const participant of participants) {
      if (!quizState.answers.has(participant.userId)) {
        await QuizAnswer.create({
          quizId,
          questionId: question.id,
          userId: participant.userId,
          answer: null,
          isCorrect: false,
          timeSpent: 0,
          score: 0,
          answeredAt: new Date(),
        });

        quizState.answers.set(participant.userId, {
          answer: null,
          timeSpent: 0,
          isCorrect: false,
          score: 0,
        });
      }
    }
  } catch (error) {
    console.error("❌ Erreur evaluateMissingAnswers:", error);
  }
}

// MODIFIEZ la fonction startQuestionTimer
function startQuestionTimer(io, quizId, questionId, duration) {
  setTimeout(async () => {
    const quizState = activeQuizzes.get(quizId);
    if (!quizState) return;

    // Émettre le temps écoulé
    io.to(`quiz_${quizId}`).emit("quiz:time_up", {
      questionId,
      message: "⏰ Temps écoulé !",
    });

    // ✅ AJOUT: Déclencher automatiquement la correction
    // Récupérer le quiz pour vérifier le créateur
    const quiz = await Quiz.findByPk(quizId);

    // Simuler l'événement show_correction (comme si le créateur l'avait fait)
    try {
      // Évaluer les réponses manquantes
      await evaluateMissingAnswers(io, quizId, quizState);

      const currentQuestion =
        quizState.questions[quizState.currentQuestionIndex];

      // Récupérer les participants avec leurs scores
      const participants = await QuizParticipant.findAll({
        where: { quizId },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "userName", "userPhoto"],
          },
        ],
        order: [["score", "DESC"]],
      });

      const leaderboard = participants.map((p) => ({
        userId: p.userId,
        userName: p.user.userName,
        userPhoto: p.user.userPhoto || "/default-avatar.png",
        score: p.score || 0,
      }));

      // ✅ ENVOYER LA CORRECTION À TOUS AUTOMATIQUEMENT
      io.to(`quiz_${quizId}`).emit("quiz:show_correction", {
        questionId: currentQuestion.id,
        correctAnswer: currentQuestion.correctAnswer,
        explanation: currentQuestion.explanation,
        leaderboard,
        autoTriggered: true, // Indiquer que c'est automatique
      });

      console.log(
        `📢 Correction automatique pour quiz ${quizId} (temps écoulé)`,
      );
    } catch (error) {
      console.error("❌ Erreur correction automatique:", error);
    }
  }, duration * 1000);
}

async function endQuiz(io, quizId, quizState) {
  try {
    const quiz = await Quiz.findByPk(quizId);
    quiz.status = "finished";
    quiz.finishedAt = new Date();
    await quiz.save();

    const participants = await QuizParticipant.findAll({
      where: { quizId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "userName", "userPhoto"],
        },
      ],
      order: [["score", "DESC"]],
    });

    // ✅ AJOUT CRITIQUE - Sauvegarder les positions et les résultats
    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];
      const position = i + 1;

      // Mettre à jour la position
      participant.position = position;
      await participant.save();

      // ✅ SAUVEGARDER DANS UserProgress
      try {
        // Calculer le pourcentage
        const percentage =
          quiz.questionCount > 0
            ? Math.round((participant.score / quiz.questionCount) * 100 * 100) /
              100
            : 0;

        // Créer l'entrée d'historique
        await UserProgress.create({
          userId: participant.userId,
          quizId: quizId,
          score: participant.score,
          position: position,
          totalQuestions: quiz.questionCount,
          percentage: percentage,
          quizType: "ia-multi", // Important : "ia-multi" pour le multi
          completedAt: new Date(),
          isGlobal: false,
        });

        // Mettre à jour les stats globales
        await updateGlobalStats(participant.userId, participant.score);

        console.log(
          `✅ Historique sauvegardé pour user ${participant.userId}: ${participant.score}/${quiz.questionCount} (position ${position})`,
        );
      } catch (progressError) {
        console.error(
          `❌ Erreur sauvegarde UserProgress pour user ${participant.userId}:`,
          progressError,
        );
      }
    }

    const leaderboard = participants.map((p, index) => ({
      position: index + 1,
      userId: p.userId,
      userName: p.user.userName,
      userPhoto: p.user.userPhoto || "/default-avatar.png",
      score: p.score,
    }));

    // ✅ ENVOYER À TOUS
    io.to(`quiz_${quizId}`).emit("quiz:ended", {
      quizId,
      leaderboard,
      finishedAt: new Date(),
    });

    activeQuizzes.delete(quizId);
    console.log(
      `🏁 Quiz ${quizId} terminé - Résultats sauvegardés pour ${participants.length} participants`,
    );
  } catch (error) {
    console.error("❌ Erreur endQuiz:", error);
  }
}

// ✅ AJOUTER cette fonction helper à la fin du fichier
async function updateGlobalStats(userId, score) {
  try {
    let globalStats = await UserProgress.findOne({
      where: { userId, isGlobal: true },
    });

    if (globalStats) {
      globalStats.totalGames += 1;
      globalStats.totalScore += score;
      globalStats.averageScore =
        Math.round((globalStats.totalScore / globalStats.totalGames) * 100) /
        100;

      if (score > globalStats.bestScore) {
        globalStats.bestScore = score;
      }

      await globalStats.save();
    } else {
      await UserProgress.create({
        userId,
        isGlobal: true,
        totalGames: 1,
        totalScore: score,
        averageScore: score,
        bestScore: score,
      });
    }
  } catch (error) {
    console.error("❌ Erreur updateGlobalStats:", error);
  }
}

module.exports = { setupQuizSocketHandlers };
