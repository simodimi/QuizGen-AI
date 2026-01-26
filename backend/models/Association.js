const sequelize = require("../config/database");
const { DataTypes } = require("sequelize");
// Import des modèles
const User = require("./User");
const Document = require("./Document");
const Section = require("./Section");
const Quiz = require("./Quiz");
const Question = require("./Question");
const QuizParticipant = require("./QuizParticipant");
const QuizAnswer = require("./QuizAnswer");
const Friend = require("./Friends");
const Message = require("./Message");
const UserProgress = require("./UserProgress");

// Associations

// User -> Document (1:N)
User.hasMany(Document, {
  foreignKey: "userId", //user devient cle etrangere de la table document
  as: "documents",
  onDelete: "CASCADE",
});
Document.belongsTo(User, {
  foreignKey: "userId",
  as: "owner",
});

// Document -> Section (1:N)
Document.hasMany(Section, {
  foreignKey: "documentId",
  as: "sections",
  onDelete: "CASCADE",
});
Section.belongsTo(Document, {
  foreignKey: "documentId",
  as: "document",
});

// Document -> Quiz (1:N)
Document.hasMany(Quiz, {
  foreignKey: "documentId",
  as: "quizzes",
  onDelete: "SET NULL",
});
Quiz.belongsTo(Document, {
  foreignKey: "documentId",
  as: "document",
});

// User -> Quiz (créateur) (1:N)
User.hasMany(Quiz, {
  foreignKey: "creatorId",
  as: "createdQuizzes",
  onDelete: "CASCADE",
});
Quiz.belongsTo(User, {
  foreignKey: "creatorId",
  as: "creator",
});

// Quiz -> Question (1:N)
Quiz.hasMany(Question, {
  foreignKey: "quizId",
  as: "questions",
  onDelete: "CASCADE",
});
Question.belongsTo(Quiz, {
  foreignKey: "quizId",
  as: "quiz",
});

// Quiz -> QuizParticipant (1:N)
Quiz.hasMany(QuizParticipant, {
  foreignKey: "quizId",
  as: "participants",
  onDelete: "CASCADE",
});
QuizParticipant.belongsTo(Quiz, {
  foreignKey: "quizId",
  as: "quiz",
});

// User -> QuizParticipant (1:N)
User.hasMany(QuizParticipant, {
  foreignKey: "userId",
  as: "quizParticipations",
  onDelete: "CASCADE",
});
QuizParticipant.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// Question -> QuizAnswer (1:N)
Question.hasMany(QuizAnswer, {
  foreignKey: "questionId",
  as: "answers",
  onDelete: "CASCADE",
});
QuizAnswer.belongsTo(Question, {
  foreignKey: "questionId",
  as: "question",
});

// User -> QuizAnswer (1:N)
User.hasMany(QuizAnswer, {
  foreignKey: "userId",
  as: "quizAnswers",
  onDelete: "CASCADE",
});
QuizAnswer.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// Quiz -> QuizAnswer (1:N)
Quiz.hasMany(QuizAnswer, {
  foreignKey: "quizId",
  as: "quizAnswers",
  onDelete: "CASCADE",
});
QuizAnswer.belongsTo(Quiz, {
  foreignKey: "quizId",
  as: "quiz",
});

// User -> Friend (relations symétriques)
User.belongsToMany(User, {
  through: Friend,
  as: "friends",
  //colonne dans Friend qui représente l'utilisateur qui envoie la demande d'amitié
  foreignKey: "requesterId",
  //colonne dans Friend qui représente l'utilisateur qui reçoit la demande d'amitié
  otherKey: "receiverId",
});
Friend.belongsTo(User, {
  foreignKey: "requesterId",
  as: "requester",
});
Friend.belongsTo(User, {
  foreignKey: "receiverId",
  as: "receiver",
});

// User -> Message (sent) (1:N)
User.hasMany(Message, {
  foreignKey: "senderId",
  as: "sentMessages",
  onDelete: "CASCADE",
});
Message.belongsTo(User, {
  foreignKey: "senderId",
  as: "sender",
});

// User -> Message (received) (1:N)
User.hasMany(Message, {
  foreignKey: "receiverId",
  as: "receivedMessages",
  onDelete: "CASCADE",
});
Message.belongsTo(User, {
  foreignKey: "receiverId",
  as: "receiver",
});

// Message -> Message (reply) (auto-référence)
Message.belongsTo(Message, {
  foreignKey: "replyToId",
  as: "replyTo",
});
Message.hasMany(Message, {
  foreignKey: "replyToId",
  as: "replies",
});

// User -> UserProgress (1:1)
User.hasOne(UserProgress, {
  foreignKey: "userId",
  as: "progress",
  onDelete: "CASCADE",
});
UserProgress.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// Quiz -> UserProgress (via QuizAnswer)
Quiz.hasMany(UserProgress, {
  foreignKey: "quizId",
  as: "userProgresses",
});
UserProgress.belongsTo(Quiz, {
  foreignKey: "quizId",
  as: "quiz",
});

module.exports = {
  sequelize,
  User,
  Document,
  Section,
  Quiz,
  Question,
  QuizParticipant,
  QuizAnswer,
  Friend,
  Message,
  UserProgress,
};
