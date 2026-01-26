const {
  User,
  Quiz,
  QuizParticipant,
  QuizAnswer,
  Document,
  Friend,
  Message,
  UserProgress,
} = require("../models");
const { Op } = require("sequelize");

const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Statistiques quiz
    const quizStats = await getQuizStatistics(userId);

    // Statistiques documents
    const documentStats = await getDocumentStatistics(userId);

    // Statistiques sociales
    const socialStats = await getSocialStatistics(userId);

    // Évolution scores
    const scoreEvolution = await getScoreEvolution(userId);

    res.json({
      success: true,
      quizStats,
      documentStats,
      socialStats,
      scoreEvolution,
      totalPoints: quizStats.totalScore,
    });
  } catch (error) {
    console.error("Erreur récupération stats:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des statistiques",
    });
  }
};

const getQuizStatistics = async (userId) => {
  const createdQuizzes = await Quiz.count({
    where: { creatorId: userId },
  });

  const participatedQuizzes = await QuizParticipant.count({
    where: { userId },
  });

  const totalScore =
    (await QuizParticipant.sum("score", {
      where: { userId },
    })) || 0;

  const answers = await QuizAnswer.findAll({
    where: { userId },
    attributes: ["isCorrect"],
  });

  const correctAnswers = answers.filter((a) => a.isCorrect).length;
  const totalAnswers = answers.length;
  const successRate =
    totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;

  const bestScore =
    (await QuizParticipant.max("score", {
      where: { userId },
    })) || 0;

  const allScores = await QuizParticipant.findAll({
    attributes: ["userId", "score"],
    group: ["userId"],
  });

  const userRank =
    allScores
      .map((p) => ({ userId: p.userId, score: p.score || 0 }))
      .sort((a, b) => b.score - a.score)
      .findIndex((p) => p.userId === userId) + 1;

  return {
    createdQuizzes,
    participatedQuizzes,
    totalScore,
    successRate: Math.round(successRate * 100) / 100,
    bestScore,
    globalRank: userRank || "N/A",
    totalAnswers,
  };
};

const getDocumentStatistics = async (userId) => {
  const documents = await Document.count({
    where: { userId },
  });

  const sharedDocuments = await Document.count({
    where: {
      userId,
      shared: true,
    },
  });

  const documentsWithQuizzes = await Document.count({
    where: { userId },
    include: [
      {
        model: Quiz,
        as: "quizzes",
        required: true,
      },
    ],
  });

  return {
    totalDocuments: documents,
    sharedDocuments,
    documentsWithQuizzes,
    documentsWithoutQuizzes: documents - documentsWithQuizzes,
  };
};

const getSocialStatistics = async (userId) => {
  const friendsCount = await Friend.count({
    where: {
      status: "accepter",
      [Op.or]: [{ requesterId: userId }, { receiverId: userId }],
    },
  });

  const pendingRequests = await Friend.count({
    where: {
      status: "attente",
      receiverId: userId,
    },
  });

  const messagesSent = await Message.count({
    where: { senderId: userId },
  });

  const messagesReceived = await Message.count({
    where: { receiverId: userId },
  });

  return {
    friendsCount,
    pendingRequests,
    messagesSent,
    messagesReceived,
    totalMessages: messagesSent + messagesReceived,
  };
};

const getScoreEvolution = async (userId) => {
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  const progressData = await UserProgress.findAll({
    where: {
      userId,
      completedAt: {
        [Op.gte]: last30Days,
      },
    },
    attributes: [
      [Op.fn("DATE", Op.col("completedAt")), "date"],
      [Op.fn("SUM", Op.col("totalScore")), "dailyScore"],
      [Op.fn("COUNT", Op.col("id")), "quizCount"],
    ],
    group: [Op.fn("DATE", Op.col("completedAt"))],
    order: [[Op.fn("DATE", Op.col("completedAt")), "ASC"]],
  });

  return progressData.map((item) => ({
    date: item.get("date"),
    score: parseInt(item.get("dailyScore") || 0),
    quizzes: parseInt(item.get("quizCount") || 0),
  }));
};

const getGlobalLeaderboard = async (req, res) => {
  try {
    const { limit = 50, timeframe = "all" } = req.query;

    let dateFilter = {};
    if (timeframe === "week") {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      dateFilter = { createdAt: { [Op.gte]: lastWeek } };
    } else if (timeframe === "month") {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      dateFilter = { createdAt: { [Op.gte]: lastMonth } };
    }

    const leaderboard = await QuizParticipant.findAll({
      where: dateFilter,
      attributes: [
        "userId",
        [Op.fn("SUM", Op.col("score")), "totalScore"],
        [Op.fn("COUNT", Op.col("quizId")), "quizCount"],
        [Op.fn("AVG", Op.col("score")), "averageScore"],
      ],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "userName", "userPhoto"],
        },
      ],
      group: ["userId"],
      order: [[Op.fn("SUM", Op.col("score")), "DESC"]],
      limit: parseInt(limit),
    });

    const formattedLeaderboard = leaderboard.map((item, index) => ({
      position: index + 1,
      userId: item.user.id,
      userName: item.user.userName,
      userPhoto: item.user.userPhoto,
      totalScore: parseInt(item.get("totalScore") || 0),
      quizCount: parseInt(item.get("quizCount") || 0),
      averageScore:
        Math.round(parseFloat(item.get("averageScore") || 0) * 100) / 100,
    }));

    res.json({
      success: true,
      leaderboard: formattedLeaderboard,
    });
  } catch (error) {
    console.error("Erreur leaderboard:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération du classement",
    });
  }
};

const getFriendsLeaderboard = async (req, res) => {
  try {
    const userId = req.user.id;

    const friendships = await Friend.findAll({
      where: {
        status: "accepter",
        [Op.or]: [{ requesterId: userId }, { receiverId: userId }],
      },
    });

    const friendIds = friendships.map((f) =>
      f.requesterId === userId ? f.receiverId : f.requesterId,
    );

    const allUserIds = [...friendIds, userId];

    const friendsScores = await QuizParticipant.findAll({
      where: {
        userId: { [Op.in]: allUserIds },
      },
      attributes: [
        "userId",
        [Op.fn("SUM", Op.col("score")), "totalScore"],
        [Op.fn("COUNT", Op.col("quizId")), "quizCount"],
      ],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "userName", "userPhoto"],
        },
      ],
      group: ["userId"],
      order: [[Op.fn("SUM", Op.col("score")), "DESC"]],
    });

    const formattedScores = friendsScores.map((item, index) => ({
      position: index + 1,
      userId: item.user.id,
      userName: item.user.userName,
      userPhoto: item.user.userPhoto,
      totalScore: parseInt(item.get("totalScore") || 0),
      quizCount: parseInt(item.get("quizCount") || 0),
      isCurrentUser: item.user.id === userId,
    }));

    res.json({
      success: true,
      leaderboard: formattedScores,
    });
  } catch (error) {
    console.error("Erreur leaderboard amis:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération du classement des amis",
    });
  }
};

const getQuizHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const participations = await QuizParticipant.findAndCountAll({
      where: { userId },
      include: [
        {
          model: Quiz,
          as: "quiz",
          include: [
            {
              model: User,
              as: "creator",
              attributes: ["id", "userName", "userPhoto"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const formattedHistory = participations.rows.map((p) => ({
      quizId: p.quiz.id,
      title: p.quiz.title,
      mode: p.quiz.mode,
      status: p.quiz.status,
      score: p.score,
      position: p.position,
      createdAt: p.createdAt,
      startedAt: p.quiz.startedAt,
      finishedAt: p.quiz.finishedAt,
      creator: p.quiz.creator,
      questionCount: p.quiz.questionCount,
      difficulty: p.quiz.difficulty,
    }));

    res.json({
      success: true,
      history: formattedHistory,
      total: participations.count,
      page: parseInt(page),
      totalPages: Math.ceil(participations.count / limit),
    });
  } catch (error) {
    console.error("Erreur historique quiz:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de l'historique",
    });
  }
};

const getPerformanceByTheme = async (req, res) => {
  try {
    const userId = req.user.id;

    const performances = await Quiz.findAll({
      include: [
        {
          model: QuizParticipant,
          as: "participants",
          where: { userId },
          required: true,
        },
      ],
      attributes: [
        "theme",
        [Op.fn("COUNT", Op.col("*")), "quizCount"],
        [Op.fn("AVG", Op.col("participants.score")), "averageScore"],
        [Op.fn("MAX", Op.col("participants.score")), "bestScore"],
      ],
      group: ["theme"],
      order: [[Op.fn("AVG", Op.col("participants.score")), "DESC"]],
    });

    const formattedPerformances = performances.map((p) => ({
      theme: p.theme || "Général",
      quizCount: parseInt(p.get("quizCount") || 0),
      averageScore:
        Math.round(parseFloat(p.get("averageScore") || 0) * 100) / 100,
      bestScore: parseInt(p.get("bestScore") || 0),
      successRate:
        p.get("averageScore") > 0
          ? Math.min(
              100,
              Math.round((p.get("averageScore") / p.get("quizCount")) * 100),
            )
          : 0,
    }));

    res.json({
      success: true,
      performances: formattedPerformances,
    });
  } catch (error) {
    console.error("Erreur performances par thème:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des performances",
    });
  }
};

module.exports = {
  getUserStats,
  getGlobalLeaderboard,
  getFriendsLeaderboard,
  getQuizHistory,
  getPerformanceByTheme,
};
