import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import "../style/quiz.css";
import a1 from "../assets/icone/logo.png";
import { Avatar } from "../store/Frontbdd";
import connect from "../services/Util";
import zik1 from "../assets/son/appuiebtn.mp3";
import zik2 from "../assets/son/zikerror.mp3";
import zik3 from "../assets/son/bien.m4a";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import { useAuth } from "../services/AuthContextUser";

// Types pour les questions
interface QuizQuestion {
  id: number;
  text: string;
  type: "qcm" | "open" | "multiple";
  choices: string[];
  correctAnswer: string | string[];
  explanation: string;
  points: number;
  timeLimit?: number;
}

interface QuizData {
  id: number;
  title: string;
  questions: QuizQuestion[];
  questionCount: number;
  status: string;
}

const QuizAutoSolo = () => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<
    string | string[] | null
  >(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [userAnswers, setUserAnswers] = useState<
    Array<{
      questionId: number;
      answer: string | string[];
      isCorrect: boolean;
      correctAnswer: string | string[];
      explanation: string;
    }>
  >([]);
  const [open, setOpen] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [showProfilMessage, setShowProfilMessage] = useState<boolean>(false);
  const { user } = useAuth();
  const [avatar, setAvatar] = useState<string | null>(`${user?.userPhoto}`);
  const navigate = useNavigate();

  // Récupérer le dernier document uploadé
  const getLastDocumentId = (): number | null => {
    const lastDocument = localStorage.getItem("lastUploadedDocument");
    return lastDocument ? JSON.parse(lastDocument).id : null;
  };

  // Générer le quiz depuis le document
  const generateQuizFromDocument = useCallback(async () => {
    const documentId = getLastDocumentId();

    if (!documentId) {
      setError("Aucun document trouvé. Veuillez d'abord uploader un document.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await connect.post(`/api/quizzes/ai/${documentId}`, {
        mode: "solo",
        questionCount: 10,
        difficulty: "medium",
      });

      if (response.data.success) {
        // Récupérer les détails du quiz
        const quizResponse = await connect.get(
          `/api/quizzes/${response.data.quizId}`,
        );
        setQuizData(quizResponse.data.quiz);

        // Démarrer le quiz
        await connect.post(`/api/quizzes/${response.data.quizId}/start`);

        // Récupérer les questions (sans les réponses correctes)
        const questionsResponse = await connect.get(
          `/api/quizzes/${response.data.quizId}`,
        );
        const questionsWithoutAnswers = questionsResponse.data.quiz.questions;

        // Pour avoir accès aux réponses correctes, on doit les stocker côté client
        // Note: Dans une vraie app, vous voudriez peut-être cacher les réponses côté serveur
        setQuizData((prev) =>
          prev
            ? {
                ...prev,
                questions: questionsWithoutAnswers,
              }
            : null,
        );

        /* // Sélectionner un avatar aléatoire
        handleSelectAvatar();*/

        // Message de bienvenue
        setMessage(`Hello ${user?.userName}, c'est parti pour le quiz IA! 🤖`);
        setShowProfilMessage(true);
        setTimeout(() => setShowProfilMessage(false), 3000);
      }
    } catch (error) {
      console.error("Erreur lors de la génération du quiz:", error);
      setError("Erreur lors de la génération du quiz. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    generateQuizFromDocument();
  }, [generateQuizFromDocument]);

  /* const handleSelectAvatar = () => {
    const picture = Avatar[Math.floor(Math.random() * Avatar.length)];
    if (picture) {
      setAvatar(picture.avatar);
    } else {
      setAvatar(a1);
    }
  };*/

  const playSound = (src: string) => {
    const audio = new Audio(src);
    audio.play();
    setTimeout(() => {
      audio.pause();
      audio.currentTime = 0;
    }, 2000);
  };

  const handleSelectAnswer = (answer: string | string[]) => {
    if (isAnswerSubmitted) return;
    playSound(zik1);
    setSelectedAnswer(answer);
  };

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || !quizData || isAnswerSubmitted) return;

    const currentQuestion = quizData.questions[currentQuestionIndex];

    try {
      // Soumettre la réponse au serveur
      const response = await connect.post("/api/answers/", {
        quizId: quizData.id,
        questionId: currentQuestion.id,
        answer: selectedAnswer,
        timeSpent: 5, // Temps fixe pour l'instant, pourrait être dynamique
      });

      if (response.data.success) {
        const isCorrect = response.data.isCorrect;
        const correctAnswer = response.data.correctAnswer;
        const explanation = response.data.explanation;
        const scoreEarned = response.data.scoreEarned;

        // Mettre à jour le score
        setScore((prev) => prev + scoreEarned);

        // Enregistrer la réponse de l'utilisateur
        setUserAnswers((prev) => [
          ...prev,
          {
            questionId: currentQuestion.id,
            answer: selectedAnswer,
            isCorrect,
            correctAnswer,
            explanation,
          },
        ]);

        // Jouer le son approprié
        if (isCorrect) {
          playSound(zik3);
          setMessage("Bonne réponse! 🎉");
        } else {
          playSound(zik2);
          setMessage("Dommage, mais bonne chance pour la prochaine! 💪");
        }

        setShowProfilMessage(true);
        setIsAnswerSubmitted(true);
      }
    } catch (error) {
      console.error("Erreur lors de la soumission de la réponse:", error);
    }
  };
  useEffect(() => {
    const stored = localStorage.getItem("lastUploadedDocument");

    if (!stored) {
      console.warn("Aucun document trouvé");
      return;
    }

    const document = JSON.parse(stored);
    console.log("Document chargé :", document);
  }, []);
  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizData!.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
      setShowProfilMessage(false);

      // Messages d'encouragement selon la progression
      const progress = (currentQuestionIndex + 1) / quizData!.questions.length;
      if (progress < 0.3) {
        setMessage(`Tu commences bien ${user?.userName}! 👍`);
      } else if (progress < 0.6) {
        setMessage("Continue comme ça, tu assures! 🔥");
      } else if (progress < 0.9) {
        setMessage("Plus que quelques questions, tu y es presque! 💪");
      } else {
        setMessage(`Dernière question, donne tout ${user?.userName}! 🏁`);
      }
      setShowProfilMessage(true);
      setTimeout(() => setShowProfilMessage(false), 2000);
    } else {
      handleFinishQuiz();
    }
  };

  // QuizAutoSolo.js - MODIFIEZ handleFinishQuiz :

  const handleFinishQuiz = async () => {
    try {
      // Vérifiez d'abord si le quiz est encore en cours
      const quizStatus = await connect.get(`/api/quizzes/${quizData!.id}`);

      if (quizStatus.data.quiz.status !== "running") {
        console.log(
          "Le quiz n'est plus en cours, statut:",
          quizStatus.data.quiz.status,
        );
        // Le quiz a déjà été terminé, passez directement aux résultats
        setShowResults(true);
        return;
      }

      // Terminer le quiz côté serveur
      await connect.post(`/api/quizzes/${quizData!.id}/end`);
      setShowResults(true);

      // Message final basé sur le score
      const percentage = (score / quizData!.questions.length) * 100;
      if (percentage >= 80) {
        setMessage(`Excellent ${user?.userName}! Tu es un génie! 🏆`);
      } else if (percentage >= 60) {
        setMessage(`Bon travail ${user?.userName}! Continue comme ça! ✨`);
      } else {
        setMessage(
          `Pas mal ${user?.userName}! L'important c'est de participer! 💪`,
        );
      }
      setShowProfilMessage(true);
    } catch (error) {
      console.error("Erreur lors de la fin du quiz:", error);
      // En cas d'erreur, affichez quand même les résultats
      setShowResults(true);
      setMessage("Quiz terminé! Votre score: " + score + " points");
    }
  };

  const handleBack = () => {
    if (!showResults) {
      setOpen(true);
    } else {
      navigate("/home");
    }
  };

  /*const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setUserAnswers([]);
    setShowResults(false);
    setIsAnswerSubmitted(false);
    setShowProfilMessage(false);
    generateQuizFromDocument();
  };*/
  const handleRestart = async () => {
    try {
      // Réinitialiser l'état
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setScore(0);
      setUserAnswers([]);
      setShowResults(false);
      setIsAnswerSubmitted(false);
      setShowProfilMessage(false);

      // Option 1: Si l'API supporte la régénération
      await generateQuizFromDocument();

      // Option 2: Sinon, mélanger les questions existantes
      if (quizData) {
        const shuffleQuestions = (questions: QuizQuestion[]) => {
          return [...questions]
            .sort(() => Math.random() - 0.5)
            .map((q) => ({
              ...q,
              choices: q.choices
                ? [...q.choices].sort(() => Math.random() - 0.5)
                : q.choices,
            }));
        };

        setQuizData((prev) =>
          prev
            ? {
                ...prev,
                questions: shuffleQuestions(prev.questions),
              }
            : null,
        );

        setMessage("Questions mélangées! Nouvelle tentative! 🔄");
        setShowProfilMessage(true);
        setTimeout(() => setShowProfilMessage(false), 2000);
      }
    } catch (error) {
      console.error("Erreur lors du redémarrage:", error);
    }
  };

  const getCurrentQuestion = () => {
    if (!quizData) return null;
    return quizData.questions[currentQuestionIndex];
  };

  const renderQuestion = () => {
    const question = getCurrentQuestion();
    if (!question) return null;

    return (
      <div className="HeaderQuiz">
        <div className="">
          <p className="text-center">
            Question{" "}
            <span className="text-green-600">
              {currentQuestionIndex + 1 < 10
                ? `0${currentQuestionIndex + 1}`
                : currentQuestionIndex + 1}
            </span>
            /{quizData!.questions.length}
          </p>
        </div>
        <div className="HeaderQuizTitle">
          <h1>{question.text}</h1>
        </div>

        {/* Affichage des choix pour QCM */}
        {question.type === "qcm" && question.choices && (
          <div className="HeaderQuizOptionBtn">
            {question.choices.map((choice, index) => {
              let className = "Quizbtn choice";
              const isSelected = selectedAnswer === choice;
              const isCorrect =
                choice === userAnswers[currentQuestionIndex]?.correctAnswer;

              if (isAnswerSubmitted) {
                if (isCorrect) {
                  className += " accept";
                } else if (isSelected && !isCorrect) {
                  className += " decline";
                }
              } else if (isSelected) {
                className += " accept";
              }

              return (
                <Button
                  className={className}
                  key={index}
                  style={{ width: "100%" }}
                  onClick={() =>
                    !isAnswerSubmitted && handleSelectAnswer(choice)
                  }
                  disabled={isAnswerSubmitted}
                >
                  {choice}
                </Button>
              );
            })}
          </div>
        )}

        {/* Affichage pour questions ouvertes */}
        {question.type === "open" && (
          <div className="OpenQuestionContainer">
            <textarea
              className="OpenQuestionInput"
              placeholder="Tapez votre réponse ici..."
              value={(selectedAnswer as string) || ""}
              onChange={(e) =>
                !isAnswerSubmitted && handleSelectAnswer(e.target.value)
              }
              disabled={isAnswerSubmitted}
              rows={3}
            />
          </div>
        )}

        {/* Affichage de l'explication après soumission */}
        {isAnswerSubmitted && userAnswers[currentQuestionIndex] && (
          <div className="AnswerFeedback">
            <div
              className={`FeedbackBox ${userAnswers[currentQuestionIndex].isCorrect ? "correct" : "incorrect"}`}
            >
              <h3>
                {userAnswers[currentQuestionIndex].isCorrect
                  ? "✅ Correct!"
                  : "❌ Incorrect"}
              </h3>
              <p>
                <strong>Explication:</strong>{" "}
                {userAnswers[currentQuestionIndex].explanation}
              </p>
              {!userAnswers[currentQuestionIndex].isCorrect && (
                <p>
                  <strong>Bonne réponse:</strong>{" "}
                  {Array.isArray(
                    userAnswers[currentQuestionIndex].correctAnswer,
                  )
                    ? userAnswers[currentQuestionIndex].correctAnswer.join(", ")
                    : userAnswers[currentQuestionIndex].correctAnswer}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Boutons de navigation */}
        <div className="QuizNavigationButtons">
          {!isAnswerSubmitted ? (
            <Button
              className="accept"
              onClick={handleSubmitAnswer}
              disabled={!selectedAnswer}
            >
              Valider la réponse
            </Button>
          ) : (
            <Button className="accept" onClick={handleNextQuestion}>
              {currentQuestionIndex < quizData!.questions.length - 1
                ? "Question suivante"
                : "Voir les résultats"}
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderResults = () => {
    if (!quizData) return null;

    const percentage = (score / quizData.questions.length) * 100;
    const getRankingMessage = () => {
      if (percentage >= 90) return "🎖️ Master du quiz";
      if (percentage >= 70) return "🥈 Expert confirmé";
      if (percentage >= 50) return "🥉 Bon niveau";
      return "💪 Continue de t'entraîner";
    };

    return (
      <div className="QuizEnd">
        <h1 className="text-center">🎯 Quiz Terminé</h1>
        <h2 className="text-center">{quizData.title}</h2>

        <div className="ScoreDisplay">
          <div className="ScoreCircle">
            <h3>
              {score} / {quizData.questions.length}
            </h3>
            <p>{percentage.toFixed(0)}%</p>
          </div>
          <h3 className="RankingTitle">{getRankingMessage()}</h3>
        </div>

        <h3 className="text-center">📊 Détail des réponses</h3>
        <div className="AnswersReview">
          {quizData.questions.map((question, index) => {
            const userAnswer = userAnswers[index];
            return (
              <div
                key={index}
                className={`AnswerItem ${userAnswer?.isCorrect ? "correct" : "incorrect"}`}
              >
                <div className="AnswerHeader">
                  <span>Question {index + 1}</span>
                  <span>{userAnswer?.isCorrect ? "✅" : "❌"}</span>
                </div>
                <p>
                  <strong>{question.text}</strong>
                </p>
                <p>
                  <strong>Votre réponse:</strong>{" "}
                  {Array.isArray(userAnswer?.answer)
                    ? userAnswer?.answer.join(", ")
                    : userAnswer?.answer || "Non répondue"}
                </p>
                <p>
                  <strong>Bonne réponse:</strong>{" "}
                  {Array.isArray(question.correctAnswer)
                    ? question.correctAnswer.join(", ")
                    : question.correctAnswer}
                </p>
                <p>
                  <strong>Explication:</strong> {userAnswer?.explanation}
                </p>
              </div>
            );
          })}
        </div>

        <div className="RankingBtn">
          <Button className="retour" onClick={() => navigate("/home")}>
            Retour à l'accueil
          </Button>
          <Button className="accept" onClick={handleRestart}>
            Recommencer le quiz
          </Button>
          <Button
            className="accept"
            onClick={() => navigate("/home/quiz/autoIA")}
          >
            Nouveau quiz IA
          </Button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="QuizHeader">
        <div className="QuizHeaderBtn">
          <Button
            className="retour"
            onClick={() => navigate("/home/quiz/autoIA")}
          >
            Retour
          </Button>
        </div>
        <div className="LoadingQuiz">
          <img src={a1} alt="Chargement" />
          <h1>L'IA génère votre quiz... ⚡</h1>
          <p>Analyse du document en cours, patientez quelques instants.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="QuizHeader">
        <div className="QuizHeaderBtn">
          <Button
            className="retour"
            onClick={() => navigate("/home/quiz/autoIA")}
          >
            Retour
          </Button>
        </div>
        <div className="ErrorQuiz">
          <img src={a1} alt="Erreur" />
          <h1>Oups! 😅</h1>
          <p>{error}</p>
          <Button
            className="accept"
            onClick={() => navigate("/home/quiz/autoIA")}
          >
            Retour à l'upload
          </Button>
        </div>
      </div>
    );
  }

  if (!quizData) {
    return (
      <div className="QuizHeader">
        <div className="QuizHeaderBtn">
          <Button
            className="retour"
            onClick={() => navigate("/home/quiz/autoIA")}
          >
            Retour
          </Button>
        </div>
        <div className="ErrorQuiz">
          <img src={a1} alt="Erreur" />
          <h1>Aucun quiz disponible</h1>
          <p>Veuillez d'abord générer un quiz depuis un document.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="QuizHeader">
      <div className="QuizHeaderBtn">
        <Button className="retour" onClick={handleBack}>
          Retour
        </Button>
        {showProfilMessage && (
          <div className="QuizWord">
            {avatar && <img src={avatar} alt="Avatar" />}
            <h1>{message}</h1>
          </div>
        )}
      </div>

      {!showResults ? renderQuestion() : renderResults()}

      {/* Dialogue de confirmation pour quitter */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        className="customdialog"
      >
        <DialogContent>
          <DialogContentText className="dialogtext">
            <p>
              Voulez-vous vraiment quitter le quiz ? Votre progression sera
              perdue. 🥲
            </p>
          </DialogContentText>
        </DialogContent>
        <DialogActions className="optionbtn">
          <Button onClick={() => setOpen(false)} className="retour">
            Annuler
          </Button>
          <Button
            className="decline"
            onClick={() => {
              setOpen(false);
              navigate("/home");
            }}
          >
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default QuizAutoSolo;
