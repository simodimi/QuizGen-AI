const {
  Quiz,
  QuizParticipant,
  User,
  Document,
  Question,
} = require("../models/Association");
const UserProgress = require("../models/UserProgress");
const { sequelize } = require("../models/Association");
const { Op } = require("sequelize");

const getCreatedQuizzes = async (req, res) => {
  try {
    const createdQuizzes = await Quiz.findAll({
      where: { creatorId: req.user.id },
      include: [
        {
          model: QuizParticipant,
          as: "participants",
          attributes: ["userId", "score", "isReady"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "userName", "userPhoto"],
            },
          ],
        },
        {
          model: Document,
          as: "document",
          attributes: ["id", "fileName", "createdAt"],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      quizzes: createdQuizzes,
    });
  } catch (error) {
    console.error("Erreur récupération quiz créés:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

const getParticipatingQuizzes = async (req, res) => {
  try {
    const participatingQuizzes = await QuizParticipant.findAll({
      where: { userId: req.user.id },
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
            {
              model: QuizParticipant,
              as: "participants",
              attributes: ["userId", "score", "isReady"],
              include: [
                {
                  model: User,
                  as: "user",
                  attributes: ["id", "userName", "userPhoto"],
                },
              ],
            },
            {
              model: Document,
              as: "document",
              attributes: ["id", "fileName"],
              required: false,
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const formattedQuizzes = participatingQuizzes.map((p) => ({
      ...p.quiz.toJSON(),
      participantInfo: {
        score: p.score,
        isReady: p.isReady,
        joinedAt: p.createdAt,
      },
    }));

    res.json({
      success: true,
      quizzes: formattedQuizzes,
    });
  } catch (error) {
    console.error("Erreur récupération quiz participants:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

const getPendingQuizzes = async (req, res) => {
  try {
    const userId = req.user.id;

    const userParticipations = await QuizParticipant.findAll({
      where: { userId },
      attributes: ["quizId"],
      raw: true,
    });

    const userQuizIds = userParticipations.map((p) => p.quizId);

    const pendingQuizzes = await Quiz.findAll({
      where: {
        status: "waiting",
        [Op.or]: [{ creatorId: userId }, { id: { [Op.in]: userQuizIds } }],
      },
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
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "userName", "userPhoto"],
            },
          ],
        },
        {
          model: Document,
          as: "document",
          attributes: ["id", "fileName"],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      quizzes: pendingQuizzes,
    });
  } catch (error) {
    console.error("Erreur récupération quiz en attente:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

const getActiveQuizzes = async (req, res) => {
  try {
    const userId = req.user.id;

    const userParticipations = await QuizParticipant.findAll({
      where: { userId },
      attributes: ["quizId"],
      raw: true,
    });

    const userQuizIds = userParticipations.map((p) => p.quizId);

    const activeQuizzes = await Quiz.findAll({
      where: {
        status: "running",
        [Op.or]: [{ creatorId: userId }, { id: { [Op.in]: userQuizIds } }],
      },
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
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "userName", "userPhoto"],
            },
          ],
        },
        {
          model: Question,
          as: "questions",
          attributes: ["id", "text", "type", "order"],
          order: [["order", "ASC"]],
        },
        {
          model: Document,
          as: "document",
          attributes: ["id", "fileName"],
          required: false,
        },
      ],
      order: [["startedAt", "DESC"]],
    });

    res.json({
      success: true,
      quizzes: activeQuizzes,
    });
  } catch (error) {
    console.error("Erreur récupération quiz actifs:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

const getCompletedQuizzes = async (req, res) => {
  try {
    const userId = req.user.id;

    const userParticipations = await QuizParticipant.findAll({
      where: { userId },
      attributes: ["quizId"],
      raw: true,
    });

    const userQuizIds = userParticipations.map((p) => p.quizId);

    const completedQuizzes = await Quiz.findAll({
      where: {
        status: "finished",
        [Op.or]: [{ creatorId: userId }, { id: { [Op.in]: userQuizIds } }],
      },
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "userName", "userPhoto"],
        },
        {
          model: QuizParticipant,
          as: "participants",
          attributes: ["userId", "score", "isReady", "position"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "userName", "userPhoto"],
            },
          ],
          order: [
            ["score", "DESC"],
            ["position", "ASC"],
          ],
        },
        {
          model: Question,
          as: "questions",
          attributes: ["id", "text", "type", "order"],
          order: [["order", "ASC"]],
        },
        {
          model: Document,
          as: "document",
          attributes: ["id", "fileName"],
          required: false,
        },
      ],
      order: [["finishedAt", "DESC"]],
    });

    res.json({
      success: true,
      quizzes: completedQuizzes,
    });
  } catch (error) {
    console.error("Erreur récupération quiz terminés:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

const getAllUserQuizzes = async (req, res) => {
  try {
    const userId = req.user.id;

    const [
      createdQuizzes,
      participatingQuizzes,
      pendingQuizzes,
      activeQuizzes,
      completedQuizzes,
    ] = await Promise.all([
      Quiz.findAll({
        where: { creatorId: userId },
        attributes: ["id", "title", "status", "mode", "createdAt"],
        order: [["createdAt", "DESC"]],
        limit: 10,
      }),
      QuizParticipant.findAll({
        where: { userId },
        include: [
          {
            model: Quiz,
            as: "quiz",
            attributes: ["id", "title", "status", "mode", "createdAt"],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: 10,
      }),
      Quiz.findAll({
        where: {
          status: "waiting",
          [Op.or]: [
            { creatorId: userId },
            {
              id: {
                [Op.in]: QuizParticipant.findAll({
                  where: { userId },
                  attributes: ["quizId"],
                  raw: true,
                }).then((participations) =>
                  participations.map((p) => p.quizId),
                ),
              },
            },
          ],
        },
        attributes: ["id", "title", "mode", "createdAt"],
        order: [["createdAt", "DESC"]],
        limit: 5,
      }),
      Quiz.findAll({
        where: {
          status: "running",
          [Op.or]: [
            { creatorId: userId },
            {
              id: {
                [Op.in]: QuizParticipant.findAll({
                  where: { userId },
                  attributes: ["quizId"],
                  raw: true,
                }).then((participations) =>
                  participations.map((p) => p.quizId),
                ),
              },
            },
          ],
        },
        attributes: ["id", "title", "mode", "startedAt"],
        order: [["startedAt", "DESC"]],
        limit: 5,
      }),
      Quiz.findAll({
        where: {
          status: "finished",
          [Op.or]: [
            { creatorId: userId },
            {
              id: {
                [Op.in]: QuizParticipant.findAll({
                  where: { userId },
                  attributes: ["quizId"],
                  raw: true,
                }).then((participations) =>
                  participations.map((p) => p.quizId),
                ),
              },
            },
          ],
        },
        attributes: ["id", "title", "mode", "finishedAt"],
        order: [["finishedAt", "DESC"]],
        limit: 10,
      }),
    ]);

    res.json({
      success: true,
      created: createdQuizzes,
      participating: participatingQuizzes.map((p) => p.quiz),
      pending: pendingQuizzes,
      active: activeQuizzes,
      completed: completedQuizzes,
      counts: {
        created: createdQuizzes.length,
        participating: participatingQuizzes.length,
        pending: pendingQuizzes.length,
        active: activeQuizzes.length,
        completed: completedQuizzes.length,
      },
    });
  } catch (error) {
    console.error("Erreur récupération tous les quiz:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

const getUserQuizzesStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const [
      totalCreated,
      totalParticipated,
      totalScore,
      averageScore,
      bestScore,
      quizzesByMode,
      quizzesByStatus,
    ] = await Promise.all([
      Quiz.count({ where: { creatorId: userId } }),
      QuizParticipant.count({ where: { userId } }),
      QuizParticipant.sum("score", { where: { userId } }) || 0,
      QuizParticipant.findAll({
        where: { userId },
        attributes: [[Op.fn("AVG", Op.col("score")), "average"]],
        raw: true,
      }).then((result) => parseFloat(result[0]?.average || 0)),
      QuizParticipant.max("score", { where: { userId } }) || 0,
      Quiz.findAll({
        where: { creatorId: userId },
        attributes: ["mode", [Op.fn("COUNT", Op.col("id")), "count"]],
        group: ["mode"],
        raw: true,
      }),
      Quiz.findAll({
        where: {
          [Op.or]: [
            { creatorId: userId },
            {
              id: {
                [Op.in]: QuizParticipant.findAll({
                  where: { userId },
                  attributes: ["quizId"],
                  raw: true,
                }).then((participations) =>
                  participations.map((p) => p.quizId),
                ),
              },
            },
          ],
        },
        attributes: ["status", [Op.fn("COUNT", Op.col("id")), "count"]],
        group: ["status"],
        raw: true,
      }),
    ]);

    res.json({
      success: true,
      totals: {
        created: totalCreated,
        participated: totalParticipated,
        totalScore,
        averageScore: Math.round(averageScore * 100) / 100,
        bestScore,
      },
      byMode: quizzesByMode.reduce((acc, item) => {
        acc[item.mode] = parseInt(item.count);
        return acc;
      }, {}),
      byStatus: quizzesByStatus.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
      recentActivity: {
        lastCreated: await Quiz.findOne({
          where: { creatorId: userId },
          order: [["createdAt", "DESC"]],
          attributes: ["id", "title", "createdAt"],
        }),
        lastParticipated: await QuizParticipant.findOne({
          where: { userId },
          include: [
            {
              model: Quiz,
              as: "quiz",
              attributes: ["id", "title"],
            },
          ],
          order: [["createdAt", "DESC"]],
        }),
      },
    });
  } catch (error) {
    console.error("Erreur récupération stats quiz:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};
// Dans userQuizzesController.js - modifier getUserQuizHistory
const getUserQuizHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type = "all", limit = 50, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    let where = { userId, isGlobal: false };
    if (type !== "all") where.quizType = type;

    const { count, rows } = await UserProgress.findAndCountAll({
      where,
      include: [
        {
          model: Quiz,
          as: "quiz",
          required: true,
          include: [
            {
              model: Document,
              as: "document",
              attributes: ["id", "fileName"],
            },
            {
              model: User,
              as: "creator",
              attributes: ["id", "userName", "userPhoto"],
            },
            {
              model: QuizParticipant,
              as: "participants",
              required: false,
              include: [
                {
                  model: User,
                  as: "user",
                  attributes: ["id", "userName", "userPhoto"],
                },
              ],
            },
          ],
        },
      ],
      order: [["completedAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Formatter les données
    const formattedHistory = rows.map((progress) => {
      const quiz = progress.quiz;
      const isMulti = quiz.mode === "multi";

      const userParticipant = quiz.participants?.find(
        (p) => p.userId === userId,
      );

      let ranking = [];
      if (isMulti && quiz.participants) {
        ranking = quiz.participants
          .sort((a, b) => b.score - a.score)
          .map((p, index) => ({
            position: index + 1,
            userId: p.userId,
            userName: p.user?.userName || "Inconnu",
            userPhoto: p.user?.userPhoto || "/default-avatar.png",
            score: p.score,
          }));
      }

      return {
        id: progress.id,
        quizId: quiz.id,
        quizTitle: quiz.title,
        quizType: progress.quizType,
        mode: quiz.mode,
        theme: quiz.theme,
        score: progress.score,
        totalQuestions: progress.totalQuestions,
        percentage: progress.percentage,
        position: progress.position,
        completedAt: progress.completedAt,
        document: quiz.document
          ? {
              id: quiz.document.id,
              fileName: quiz.document.fileName,
              originalName: quiz.document.fileName,
            }
          : null,
        creator: quiz.creator
          ? {
              id: quiz.creator.id,
              userName: quiz.creator.userName,
              userPhoto: quiz.creator.userPhoto,
            }
          : null,
        ranking: ranking,
        userRank: userParticipant
          ? ranking.findIndex((r) => r.userId === userId) + 1
          : null,
      };
    });

    // Calculer les stats globales
    const globalStats = await UserProgress.findAll({
      where: { userId },
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("id")), "totalGames"],
        [sequelize.fn("SUM", sequelize.col("score")), "totalScore"],
        [sequelize.fn("AVG", sequelize.col("score")), "averageScore"],
        [sequelize.fn("MAX", sequelize.col("score")), "bestScore"],
      ],
      raw: true,
    });

    res.json({
      success: true,
      history: formattedHistory,
      globalStats: {
        totalGames: parseInt(globalStats[0]?.totalGames) || 0,
        totalScore: parseInt(globalStats[0]?.totalScore) || 0,
        averageScore: parseFloat(globalStats[0]?.averageScore) || 0,
        bestScore: parseInt(globalStats[0]?.bestScore) || 0,
      },
      pagination: {
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / limit),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("❌ Erreur getUserQuizHistory:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de l'historique",
    });
  }
};
module.exports = {
  getCreatedQuizzes,
  getParticipatingQuizzes,
  getPendingQuizzes,
  getActiveQuizzes,
  getCompletedQuizzes,
  getAllUserQuizzes,
  getUserQuizzesStats,
  getUserQuizHistory,
};
