const express = require("express");
const router = express.Router();
const {
  submitAnswer,
  getQuizAnswers,
} = require("../controllers/answerController");

router.post("/", submitAnswer);
router.get("/quiz/:quizId", getQuizAnswers);

module.exports = router;
