const express = require("express");
const router = express.Router();
const {
  generateQuizFromDocument,
  createPredefinedQuiz,
  getQuiz,
  startQuiz,
  joinQuizByCode,
  setPlayerReady,
  endQuiz,
  getNextQuestion,
  getUserQuizzes,
  cancelQuiz,
  detailQuiz,
  saveQuizResult,
  getQuizRanking,
} = require("../controllers/quizController");

// Génération de quiz
router.post("/ai/:documentId", generateQuizFromDocument);
router.post("/predefined", createPredefinedQuiz);

// Gestion des quiz
router.get("/:id", getQuiz);
router.post("/:id/start", startQuiz);
router.post("/join/:code", joinQuizByCode);
router.post("/:id/ready", setPlayerReady);
router.post("/:id/end", endQuiz);
router.get("/:id/next-question", getNextQuestion);
router.delete("/:id", cancelQuiz);
router.get("/details/:code", detailQuiz);

// Quiz de l'utilisateur
router.get("/user/all", getUserQuizzes);
router.post("/classic/save-result", saveQuizResult);
router.get("/ranking/:theme", getQuizRanking);
module.exports = router;
