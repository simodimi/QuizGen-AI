import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
import { io, Socket } from "socket.io-client";

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
  const location = useLocation();
  const { documentId, fileName } = location.state || {};

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
  const hasGenerated = useRef(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressMessage, setProgressMessage] =
    useState<string>("Initialisation...");
  const [progressStep, setProgressStep] = useState<number>(0);
  const [generationTime, setGenerationTime] = useState<number>(0);
  const [startTime] = useState<number>(Date.now());
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const socketInitialized = useRef<boolean>(false); // ← AJOUTER

  // SOLUTION: Même pattern que QuizAutoMulti
  useEffect(() => {
    if (!user?.id) return;
    if (socketInitialized.current) {
      console.log("⚠️ Socket déjà initialisé, on ignore");
      return;
    }

    console.log("🔄 Initialisation du socket pour QuizAutoSolo");
    socketInitialized.current = true;

    const newSocket = io("http://localhost:5000", {
      withCredentials: true,
      query: { userId: user.id.toString() },
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("✅ Socket connecté pour quiz solo");
      setIsConnected(true);
      newSocket.emit("join_user_room", user.id);
    });

    const handleProgress = (data: {
      step: number;
      message: string;
      progress: number;
    }) => {
      console.log("📊 Progression reçue:", data);
      setProgressStep(data.step);
      setProgressMessage(data.message);
      setProgress(data.progress);

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      setGenerationTime(elapsed);
    };

    const handleError = (data: { message: string }) => {
      console.error("❌ Erreur socket:", data);
      setProgressMessage(`❌ ${data.message}`);
    };

    const handleDisconnect = () => {
      console.log("🔌 Socket déconnecté");
      setIsConnected(false);
    };

    newSocket.on("quiz:generation_progress", handleProgress);
    newSocket.on("quiz:generation_error", handleError);
    newSocket.on("disconnect", handleDisconnect);

    return () => {
      console.log("🧹 Nettoyage du socket");
      newSocket.off("connect");
      newSocket.off("quiz:generation_progress", handleProgress);
      newSocket.off("quiz:generation_error", handleError);
      newSocket.off("disconnect", handleDisconnect);
      newSocket.disconnect();
      socketInitialized.current = false;
    };
  }, [user?.id, startTime]);
  // Sélectionner un avatar aléatoire
  useEffect(() => {
    const picture = Avatar[Math.floor(Math.random() * Avatar.length)];
    setAvatar(picture?.avatar || a1);
  }, []);

  // SOLUTION: useCallback avec dépendances stables ET ref pour éviter les doublons
  const generateQuizFromDocument = useCallback(async () => {
    // Éviter les appels multiples
    if (hasGenerated.current) return;

    if (!documentId) {
      setError(
        "Aucun document sélectionné. Veuillez d'abord uploader un document.",
      );
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      hasGenerated.current = true; // 🔥 Marquer comme généré immédiatement

      console.log(`📄 Génération du quiz pour le document ${documentId}`);

      // Appel API avec timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 2 minutes timeout

      const response = await connect.post(
        `/api/quizzes/ai/${documentId}`,
        {
          mode: "solo",
          difficulty: "medium",
        },
        { signal: controller.signal },
      );

      clearTimeout(timeoutId);

      if (response.data.success) {
        const quizId = response.data.quizId;
        console.log(`✅ Quiz généré avec succès: ${quizId}`);

        // Récupérer les détails du quiz
        const quizResponse = await connect.get(`/api/quizzes/${quizId}`);
        setQuizData(quizResponse.data.quiz);

        // Démarrer le quiz
        await connect.post(`/api/quizzes/${quizId}/start`);

        setMessage(
          `Hello ${user?.userName}, c'est parti pour le quiz "${fileName || "IA"}"! 🤖`,
        );
        setShowProfilMessage(true);
        setTimeout(() => setShowProfilMessage(false), 3000);
      }
    } catch (error: any) {
      console.error("❌ Erreur lors de la génération du quiz:", error);

      if (error.name === "AbortError" || error.code === "ECONNABORTED") {
        setError(
          "Le serveur met trop de temps à répondre. Veuillez réessayer.",
        );
      } else if (error.response?.status === 400) {
        setError(
          error.response.data.message ||
            "Document incompatible pour générer un quiz.",
        );
      } else if (error.response?.status === 404) {
        setError("Document non trouvé. Veuillez réessayer.");
      } else {
        setError("Erreur lors de la génération du quiz. Veuillez réessayer.");
      }

      // Réinitialiser le flag pour permettre une nouvelle tentative
      hasGenerated.current = false;
    } finally {
      setIsLoading(false);
    }
  }, [documentId, fileName, user?.userName]); // Dépendances stables

  // 🔥 SOLUTION: useEffect avec une seule exécution
  useEffect(() => {
    generateQuizFromDocument();
  }, [generateQuizFromDocument]); // Dépendance unique et stable

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

  const handleFinishQuiz = async () => {
    try {
      // Vérifier d'abord si le quiz est encore en cours
      const quizStatus = await connect.get(`/api/quizzes/${quizData!.id}`);

      if (quizStatus.data.quiz.status !== "running") {
        console.log(
          "Le quiz n'est plus en cours, statut:",
          quizStatus.data.quiz.status,
        );
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

      // Régénérer le quiz avec le même document
      await generateQuizFromDocument();

      setMessage("Nouveau quiz généré! 🔄");
      setShowProfilMessage(true);
      setTimeout(() => setShowProfilMessage(false), 2000);
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

  // 🔥 Vérification de la présence du documentId
  if (!documentId && !isLoading) {
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
          <h1>Document manquant! 😅</h1>
          <p>
            Aucun document sélectionné. Veuillez d'abord uploader un document.
          </p>
          <Button
            className="accept"
            onClick={() => navigate("/home/quiz/autoIA")}
          >
            Uploader un document
          </Button>
        </div>
      </div>
    );
  }

  /* if (isLoading) {
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
          <p>
            Analyse du document "{fileName || "..."}" en cours, patientez
            quelques instants.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Cela peut prendre jusqu'à 30 secondes
          </p>
        </div>
      </div>
    );
  }*/
  // Composant pour les étapes
  const StepItem = ({
    step,
    currentStep,
    title,
    done,
  }: {
    step: number;
    currentStep: number;
    title: string;
    done: boolean;
  }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        opacity: done ? 1 : 0.7,
      }}
    >
      <div
        style={{
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          backgroundColor: done
            ? "#4caf50"
            : currentStep === step
              ? "#ff9800"
              : "#ccc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: "14px",
        }}
      >
        {done ? "✓" : step}
      </div>
      <span
        style={{
          fontWeight: currentStep === step ? "bold" : "normal",
          color: currentStep === step ? "#2196f3" : "inherit",
        }}
      >
        {title}
      </span>
      {currentStep === step && (
        <span style={{ marginLeft: "auto", color: "#ff9800" }}>⏳</span>
      )}
    </div>
  );
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
          <h1>Génération du quiz en cours... ⚡</h1>
          <p>Document : "{fileName || "..."}"</p>

          {/* 🔥 BARRE DE PROGRESSION DYNAMIQUE */}
          <div
            className="progress-container"
            style={{ width: "80%", margin: "20px auto" }}
          >
            <div
              className="progress-bar-bg"
              style={{
                height: "30px",
                backgroundColor: "#f0f0f0",
                borderRadius: "15px",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                className="progress-bar-fill"
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  backgroundColor:
                    progress < 30
                      ? "#ff9800"
                      : progress < 70
                        ? "#2196f3"
                        : "#4caf50",
                  transition: "width 0.3s ease-in-out",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: "bold",
                }}
              >
                {progress > 10 && `${progress}%`}
              </div>
            </div>
          </div>

          {/* 🔥 MESSAGE DE PROGRESSION */}
          <p
            className="progress-message"
            style={{
              fontSize: "1.2rem",
              margin: "15px 0",
              color: "#666",
              fontWeight: "bold",
            }}
          >
            {progressMessage}
          </p>

          {/* 🔥 TEMPS ÉCOULÉ */}
          <p
            className="elapsed-time"
            style={{ color: "#999", marginBottom: "20px" }}
          >
            ⏱️ {Math.floor(generationTime / 60)}:
            {(generationTime % 60).toString().padStart(2, "0")}
          </p>

          {/* 🔥 ÉTAPES DÉTAILLÉES */}
          <div
            className="loading-steps"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              width: "100%",
              maxWidth: "400px",
              margin: "20px auto",
            }}
          >
            <StepItem
              step={1}
              currentStep={progressStep}
              title="Extraction du texte"
              done={progress > 20}
            />
            <StepItem
              step={2}
              currentStep={progressStep}
              title="Analyse du contenu"
              done={progress > 30}
            />
            <StepItem
              step={3}
              currentStep={progressStep}
              title="Préparation du prompt"
              done={progress > 40}
            />
            <StepItem
              step={4}
              currentStep={progressStep}
              title="Génération IA (la plus longue)"
              done={progress > 60}
            />
            <StepItem
              step={5}
              currentStep={progressStep}
              title="Extraction des questions"
              done={progress > 80}
            />
            <StepItem
              step={6}
              currentStep={progressStep}
              title="Finalisation"
              done={progress >= 100}
            />
          </div>

          <p className="text-sm text-gray-500 mt-4">
            ⏳ La génération peut prendre jusqu'à 3 minutes pour un document
            long
          </p>
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
