const { QuizAnswer, Question, QuizParticipant, Quiz } = require("../models");
const { Op } = require("sequelize");

const submitAnswer = async (req, res) => {
  try {
    const { quizId, questionId, answer, timeSpent } = req.body;

    const quiz = await Quiz.findByPk(quizId);
    if (!quiz || quiz.status !== "running") {
      return res.status(400).json({
        success: false,
        message: "Le quiz n'est pas en cours",
      });
    }

    const question = await Question.findByPk(questionId);
    if (!question || question.quizId !== parseInt(quizId)) {
      return res.status(404).json({
        success: false,
        message: "Question non trouvée",
      });
    }

    let isCorrect = false;
    let scoreEarned = 0;

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
    const timeBonus = timeSpent < 10 ? 0.5 : 0;
    scoreEarned = isCorrect ? basePoints + timeBonus : 0;

    const quizAnswer = await QuizAnswer.create({
      quizId,
      questionId,
      userId: req.user.id,
      answer: answer,
      isCorrect,
      timeSpent,
      score: scoreEarned,
      answeredAt: new Date(),
    });

    const participant = await QuizParticipant.findOne({
      where: { quizId, userId: req.user.id },
    });

    if (participant) {
      participant.score = (participant.score || 0) + scoreEarned;
      participant.lastAnswerAt = new Date();
      await participant.save();
    }

    if (global.io && quiz.mode === "multi") {
      global.io.to(`quiz_${quizId}`).emit("ANSWER_PROCESSED", {
        userId: req.user.id,
        questionId,
        isCorrect,
        scoreEarned,
        currentScore: participant?.score || 0,
      });
    }

    res.json({
      success: true,
      isCorrect,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      scoreEarned,
      totalScore: participant?.score || 0,
      timeSpent,
    });
  } catch (error) {
    console.error("Erreur soumission réponse:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la soumission de la réponse",
    });
  }
};

const getQuizAnswers = async (req, res) => {
  try {
    const { quizId } = req.params;

    const answers = await QuizAnswer.findAll({
      where: {
        quizId,
        userId: req.user.id,
      },
      include: [
        {
          model: Question,
          as: "question",
          attributes: ["id", "text", "type", "explanation"],
        },
      ],
      order: [["answeredAt", "ASC"]],
    });

    res.json({
      success: true,
      answers,
    });
  } catch (error) {
    console.error("Erreur récupération réponses:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

module.exports = {
  submitAnswer,
  getQuizAnswers,
};
