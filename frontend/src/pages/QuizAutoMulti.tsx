import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../style/quiz.css";
import connect from "../services/Util";
import { useAuth } from "../services/AuthContextUser";
import { io, Socket } from "socket.io-client";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import DialogContentText from "@mui/material/DialogContentText";
import { toast } from "react-toastify";
import Button from "../components/ui/Button";
import img1 from "../assets/icone/un.png";
import img2 from "../assets/icone/deux.png";
import img3 from "../assets/icone/trois.png";
import img4 from "../assets/icone/oth.png";
import a1 from "../assets/icone/logo.png";
interface Friend {
  id: number;
  name: string;
  photo: string;
}

interface QuizQuestion {
  id: number;
  text: string;
  type: "qcm" | "open" | "multiple";
  choices: string[];
  correctAnswer?: string | string[];
  explanation?: string;
  points: number;
  timeLimit: number;
}

interface QuizData {
  id: number;
  title: string;
  questions: QuizQuestion[];
  questionCount: number;
  status: string;
  invitationCode: string;
  creatorId: number;
  documentId?: number;
}

interface Participant {
  userId: number;
  userName: string;
  userPhoto: string;
  isReady: boolean;
  score: number;
  position?: number;
}

interface LeaderboardEntry {
  userId: number;
  userName: string;
  userPhoto: string;
  score: number;
  position?: number;
}
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
const QuizAutoMulti: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // États principaux
  const [selectedFriends, setSelectedFriends] = useState<Friend[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isCreator, setIsCreator] = useState<boolean>(true);
  const [invitationCode, setInvitationCode] = useState<string>("");
  const [showJoinDialog, setShowJoinDialog] = useState<boolean>(true);
  const [joinedViaCode, setJoinedViaCode] = useState<boolean>(false);
  const [hasJoined, setHasJoined] = useState<boolean>(false);
  const [documentId, setDocumentId] = useState<number | null>(null);

  // États du jeu
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(
    null,
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(true); // Commence à true
  const [progress, setProgress] = useState<number>(0);
  const [progressMessage, setProgressMessage] =
    useState<string>("Initialisation...");
  const [progressStep, setProgressStep] = useState<number>(0);
  const [fileName, setFileName] = useState<string>("");
  const [quizReady, setQuizReady] = useState<boolean>(false);

  // États principaux
  const [step, setStep] = useState<number>(0); // 0 = génération, 1 = sélection amis, 2 = salon, 3 = jeu, 4 = résultats
  const [selectedAnswer, setSelectedAnswer] = useState<
    string | string[] | null
  >(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(40);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);

  // États pour la correction
  const [showCorrection, setShowCorrection] = useState<boolean>(false);
  const [correctAnswer, setCorrectAnswer] = useState<string | string[] | null>(
    null,
  );
  const [explanation, setExplanation] = useState<string>("");

  // Socket
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Références
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [userAnswers, setUserAnswers] = useState<
    Array<{
      questionId: number;
      answer: string | string[] | null;
      isCorrect: boolean;
      correctAnswer: string | string[];
      explanation: string;
    }>
  >([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(true); // Traitement en cours
  const [processingProgress, setProcessingProgress] = useState<number>(0);

  // Récupérer le documentId depuis le state de navigation
  useEffect(() => {
    // Récupérer le documentId depuis le state de navigation
    if (location.state) {
      const {
        documentId: docId,
        fileName,
        isProcessing,
      } = location.state as any;
      if (docId) {
        setDocumentId(docId);
        setFileName(fileName || "document");
        if (isProcessing) {
          setIsProcessing(true);
          setStep(0); // Afficher l'écran de génération
        } else {
          setIsProcessing(false);
        }
        console.log(" Document ID reçu:", docId, fileName);
      }
    }
  }, [location]);
  const startGeneration = useCallback(async () => {
    if (!documentId) return;

    console.log("🚀 Lancement de la génération pour document:", documentId);
    setIsGenerating(true);
    setStep(0);

    try {
      const response = await connect.post(`/api/quizzes/ai/${documentId}`, {
        mode: "multi",
        difficulty: "medium",
        selectedFriends: [],
      });

      if (response.data.success) {
        console.log("✅ Génération démarrée avec succès");
      }
    } catch (error) {
      console.error("❌ Erreur génération:", error);
      toast.error("Erreur lors de la génération");
      setIsGenerating(false);
    }
  }, [documentId]);
  //  lancer la génération
  useEffect(() => {
    if (documentId && !quizData && !isProcessing) {
      console.log(
        "Lancement automatique de la génération pour document:",
        documentId,
      );

      startGeneration();
    }
  }, [documentId, quizData, isProcessing]);
  // Récupérer le code depuis l'URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const codeFromUrl = params.get("code");

    if (codeFromUrl) {
      console.log("Code trouvé dans l'URL:", codeFromUrl);
      setIsCreator(false);
      setInvitationCode(codeFromUrl);
      setStep(2);
      setShowJoinDialog(false);
      setJoinedViaCode(true);
      setIsGenerating(false);
      setIsProcessing(false);
      if (socket && user) {
        handleJoinByCode(codeFromUrl);
      }
    }
  }, [location, socket, user]);

  // INITIALISATION SOCKET
  useEffect(() => {
    if (!user?.id) return;

    const newSocket = io("http://localhost:5000", {
      withCredentials: true,
      query: { userId: user.id.toString() },
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Socket connecté pour quiz multi");
      setIsConnected(true);
      newSocket.emit("join_user_room", user.id);
      // Si on est un participant avec un code, rejoindre automatiquement
      if (joinedViaCode && invitationCode) {
        setTimeout(() => {
          handleJoinByCode(invitationCode);
        }, 500);
      }
    });
    newSocket.on("document:indexed", (data) => {
      const expectedDocId = location.state?.documentId;
      console.log("ÉVÉNEMENT REÇU - document:indexed:", data);
      console.log("documentId reçu:", data.documentId);
      console.log("documentId attendu:", expectedDocId);

      if (data.documentId === expectedDocId) {
        console.log("CORRESPONDANCE TROUVÉE !");
        setIsProcessing(false);
        setProcessingProgress(100);
        setDocumentId(data.documentId);
        if (!quizData) {
          console.log("Lancement de startGeneration()");
          startGeneration();
        }
      } else {
        console.log("PAS DE CORRESPONDANCE");
      }
    });

    newSocket.on("document:indexing_progress", (data) => {
      console.log("Progression indexation:", data);
      setProcessingProgress(data.percent);
    });
    // PROGRESSION DE LA GÉNÉRATION
    newSocket.on("quiz:generation_progress", (data) => {
      console.log("Progression génération multi:", data);
      setProgressStep(data.step);
      setProgressMessage(data.message);
      setProgress(data.progress);
    });

    // FIN DE GÉNÉRATION
    newSocket.on("quiz:generation_complete", (data) => {
      console.log(" Génération terminée:", data);

      const newQuizData = {
        id: data.quizId,
        title: data.title,
        questions: [],
        questionCount: data.questionCount || 0,
        status: "waiting",
        invitationCode: data.invitationCode,
        creatorId: Number(user!.id),
        documentId: documentId!,
      };

      setQuizData(newQuizData);
      setInvitationCode(data.invitationCode);
      setIsGenerating(false);
      setQuizReady(true);

      // Passer à l'étape 1 (sélection des amis)
      setStep(1);

      // Rejoindre la room
      if (newSocket) {
        newSocket.emit("join_quiz_room", { quizId: data.quizId });
      }
    });

    // ERREUR DE GÉNÉRATION
    newSocket.on("quiz:generation_error", (data) => {
      console.error("Erreur génération:", data);
      toast.error(data.message);
      setIsGenerating(false);
      // En cas d'erreur, on peut retourner à l'accueil
      setTimeout(() => navigate("/home"), 3000);
    });

    // RECEVOIR LES INFOS DU QUIZ
    newSocket.on("quiz:quiz_info", (data) => {
      console.log("Infos du quiz reçues:", data);
      setQuizData((prev) => ({
        id: data.quizId,
        title: data.title,
        questions: [],
        questionCount: data.questionCount || 0,
        status: "waiting",
        invitationCode: invitationCode || "",
        creatorId: data.creatorId,
      }));
    });

    // 📌 RECEVOIR LA CONFIRMATION DE REJOINDRE
    newSocket.on("quiz:joined", (data) => {
      console.log("✅ Confirmé comme participant:", data);
      setIsCreator(data.isCreator);
      setHasJoined(true);
    });

    newSocket.on("quiz:participants_update", (data) => {
      setParticipants(data.participants);
    });

    // 📌 JOUEUR PRÊT
    newSocket.on("quiz:player_ready", (data) => {
      console.log("✅ Joueur prêt:", data);
      setParticipants(data.participants);
    });

    // 📌 DÉBUT D'UNE QUESTION - POUR TOUS LES JOUEURS
    newSocket.on("quiz:question_start", (data) => {
      console.log("Question démarrée:", data);

      // RÉINITIALISATION COMPLÈTE POUR TOUS LES JOUEURS
      setShowCorrection(false);
      setCorrectAnswer(null);
      setExplanation("");
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);

      //  MÊME QUESTION POUR TOUT LE MONDE
      setCurrentQuestion(data.question);
      setCurrentQuestionIndex(data.questionNumber);
      setTotalQuestions(data.totalQuestions);

      //  DÉMARRER LE TIMER POUR TOUS
      startTimer(data.timeLimit);

      //  PASSER À L'ÉTAPE DU JEU POUR TOUS
      setStep(3);

      toast.info(`Question ${data.questionNumber}/${data.totalQuestions}`);
    });

    // Dans le useEffect du socket, modifiez le handler quiz:answer_result
    newSocket.on("quiz:answer_result", (data) => {
      console.log("🎯 Résultat réponse:", data);
      setExplanation(data.explanation);

      // AJOUT: Enregistrer la réponse de l'utilisateur
      if (currentQuestion) {
        setUserAnswers((prev) => {
          // Éviter les doublons
          const existing = prev.find(
            (a) => a.questionId === currentQuestion.id,
          );
          if (existing) return prev;

          return [
            ...prev,
            {
              questionId: currentQuestion.id,
              answer: selectedAnswer,
              isCorrect: data.isCorrect,
              correctAnswer: data.correctAnswer,
              explanation: data.explanation,
            },
          ];
        });
      }
    });

    // MISE À JOUR DU CLASSEMENT EN DIRECT
    newSocket.on("quiz:leaderboard_update", (data) => {
      console.log("🏆 Classement mis à jour:", data);
      setLeaderboard(data.leaderboard);

      // Mettre à jour les scores dans participants
      setParticipants((prev) =>
        prev.map((p) => {
          const updated = data.leaderboard.find(
            (l: any) => l.userId === p.userId,
          );
          return updated ? { ...p, score: updated.score } : p;
        }),
      );
    });

    //  AFFICHAGE AUTOMATIQUE DE LA CORRECTION
    newSocket.on("quiz:show_correction", (data) => {
      console.log("Correction reçue:", data);
      setShowCorrection(true);
      setCorrectAnswer(data.correctAnswer);
      setExplanation(data.explanation);
      setLeaderboard(data.leaderboard);
      if (data.autoTriggered) {
        toast.info("⏰ Temps écoulé ! Voici la correction.");
      }
    });

    //  TEMPS ÉCOULÉ
    newSocket.on("quiz:time_up", (data) => {
      console.log("⏰ Temps écoulé:", data);
      setTimeLeft(0);
    });

    //  QUIZ TERMINÉ
    newSocket.on("quiz:ended", (data) => {
      console.log(" Quiz terminé:", data);
      setStep(4);
      setLeaderboard(data.leaderboard);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    });

    //  ERREURS
    newSocket.on("quiz:join_error", (data) => {
      toast.error(data.message);
    });

    newSocket.on("quiz:start_error", (data) => {
      toast.error(data.message);
    });

    newSocket.on("connect_error", (error) => {
      console.error(" Erreur connexion Socket:", error);
      toast.error("Erreur de connexion au serveur");
    });

    return () => {
      if (newSocket) newSocket.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user?.id, isCreator]);
  // écouter les erreurs socket
  useEffect(() => {
    if (!socket) return;

    socket.on("quiz:join_error", (data) => {
      if (data.code === "QUIZ_STARTED") {
        toast.error("⏰ La partie a déjà commencé !");
        // Rediriger ou réinitialiser
        setStep(0);
        setShowJoinDialog(true);
      } else if (data.code === "ALREADY_JOINED") {
        //toast.info("👋 Vous êtes déjà dans cette partie");
        // Peut-être rediriger vers la salle d'attente
        if (quizData?.id) {
          setStep(2);
        }
      } else {
        toast.error(data.message || "Erreur de connexion");
      }
    });

    return () => {
      socket.off("quiz:join_error");
    };
  }, [socket, quizData]);
  //  REJOINDRE UN QUIZ
  const handleJoinByCode = async (code: string) => {
    if (!socket || !user) {
      toast.error("Connexion au serveur en cours...");
      return;
    }

    if (!code) {
      toast.error("Veuillez saisir un code");
      return;
    }

    try {
      const response = await connect.post(`/api/quizzes/join/${code}`);

      if (response.data.success) {
        const { quizId, title, creatorId, questionCount } = response.data;

        setQuizData({
          id: quizId,
          title: title,
          questions: [],
          questionCount: questionCount || 0,
          status: "waiting",
          invitationCode: code,
          creatorId: creatorId,
        });

        setStep(2);
        setIsCreator(false);
        setJoinedViaCode(true);
        setShowJoinDialog(false);
        setInvitationCode(code);

        //  REJOINDRE LA ROOM SOCKET
        socket.emit("join_quiz_room", { quizId });
        socket.emit("quiz:join_by_code", { invitationCode: code });
      }
    } catch (error: any) {
      console.error("❌ Erreur rejoindre quiz:", error);
    }
  };

  //  MARQUER COMME PRÊT
  const markAsReady = () => {
    if (!socket) {
      toast.error("Connexion au serveur perdue");
      return;
    }

    if (!quizData?.id) {
      toast.error("Erreur: identifiant du quiz manquant");
      return;
    }

    socket.emit("quiz:player_ready", { quizId: quizData.id });
  };
  const generateMultiQuiz = async () => {
    if (selectedFriends.length === 0) {
      toast.error("Veuillez sélectionner au moins un ami");
      return;
    }

    if (!quizData?.id) {
      toast.info("Génération du quiz en cours, veuillez patienter...");
      return;
    }

    try {
      setStep(2);

      // Construction du lien avec le format startXXXquiz-IA
      const invitationLink = `start${quizData.invitationCode}quiz-IA`;

      for (const friend of selectedFriends) {
        try {
          await connect.post("/api/messages", {
            receiverId: friend.id,
            content: `${user!.userName} vous invite à un quiz "${quizData.title}"!\n\nCliquez sur ce lien pour rejoindre:\n${invitationLink}`,
            messageType: "quiz_invitation",
          });
        } catch (error) {
          console.error(`Erreur envoi message à ${friend.name}:`, error);
        }
      }

      toast.success("✅ Invitations envoyées !");
    } catch (error) {
      console.error("Erreur lors de l'envoi des invitations:", error);
      toast.error("Erreur lors de l'envoi des invitations");
    }
  };
  //  DÉMARRER LE QUIZ
  const startQuiz = () => {
    if (!socket || !quizData || !isCreator) return;

    const readyCount = participants.filter((p) => p.isReady).length;
    if (readyCount < 2) {
      toast.warning("Attendez qu'au moins un autre joueur soit prêt");
      return;
    }

    socket.emit("quiz:multi_start", { quizId: quizData.id });
  };

  //  PASSER À LA QUESTION SUIVANTE (Créateur uniquement)
  const nextQuestion = () => {
    if (!socket || !quizData || !isCreator) return;
    socket.emit("quiz:next_question", { quizId: quizData.id });

    // ✅ RÉINITIALISER LOCALEMENT
    setShowCorrection(false);
    setCorrectAnswer(null);
    setExplanation("");
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
  };

  //  SOUMETTRE UNE RÉPONSE
  const submitAnswer = () => {
    if (
      !socket ||
      !quizData ||
      !currentQuestion ||
      !selectedAnswer ||
      isAnswerSubmitted
    )
      return;

    socket.emit("quiz:multi_answer", {
      quizId: quizData.id,
      questionId: currentQuestion.id,
      answer: selectedAnswer,
    });

    setIsAnswerSubmitted(true);
  };

  // Timer
  const startTimer = (duration: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(duration);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Charger les amis
  useEffect(() => {
    const loadFriends = async () => {
      try {
        const res = await connect.get("/api/friends");
        const friendsList: Friend[] = res.data.friends.map((f: any) => ({
          id: f.friend.id,
          name: f.friend.userName,
          photo: f.friend.userPhoto || "/default-avatar.png",
        }));
        setFriends(friendsList);
      } catch (error) {
        console.error("Erreur chargement amis:", error);
      }
    };

    if (user) loadFriends();
  }, [user]);

  // Copier le code d'invitation
  const copyInvitationCode = () => {
    const link = `start${invitationCode}quiz-IA`;
    navigator.clipboard
      .writeText(link)
      .then(() => toast.success("Lien copié!"))
      .catch(() => toast.error("Impossible de copier"));
  };

  // Sélectionner/désélectionner un ami
  const toggleFriendSelection = (friend: Friend) => {
    setSelectedFriends((prev) => {
      const isSelected = prev.some((f) => f.id === friend.id);
      if (isSelected) {
        return prev.filter((f) => f.id !== friend.id);
      } else {
        return [...prev, friend];
      }
    });
  };
  const renderProcessing = () => (
    <div className="LoadingQuiz">
      <img src={a1} alt="Traitement" />
      <h1>Préparation du document en cours... 📄</h1>
      <p>Fichier : "{fileName || "document"}"</p>
      {processingProgress > 0 ? (
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
            }}
          >
            <div
              className="progress-bar-fill"
              style={{
                width: `${processingProgress}%`,
                height: "100%",
                backgroundColor: "#4caf50",
                transition: "width 0.3s ease-in-out",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: "bold",
              }}
            >
              {processingProgress > 10 && `${processingProgress}%`}
            </div>
          </div>
        </div>
      ) : (
        <div className="spinner" style={{ margin: "20px auto" }}>
          <div className="loading-spinner"></div>
        </div>
      )}
      <p className="text-sm text-gray-500">
        Indexation du document pour une meilleure qualité de quiz...
      </p>
    </div>
  );
  //  Rendu étape 0 - Génération
  const renderGenerating = () => (
    <div className="LoadingQuiz">
      <img src={a1} alt="Chargement" />
      <h1>Génération du quiz multi en cours... ⚡</h1>
      <p>Document : "{fileName || "document"}"</p>

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
          title="Génération IA"
          done={progress > 60}
        />
        <StepItem
          step={5}
          currentStep={progressStep}
          title="Création du salon"
          done={progress > 80}
        />
        <StepItem
          step={6}
          currentStep={progressStep}
          title="Quiz prêt !"
          done={progress >= 100}
        />
      </div>

      <p className="text-sm text-gray-500 mt-4">
        ⏳ La génération peut prendre jusqu'à 3 minutes pour un document long
      </p>
    </div>
  );

  // Rendu étape 1 - Sélection des amis
  const renderStep1 = () => (
    <div className="QuizMultiStep1">
      <h1>Créer un Quiz Multi-Joueurs</h1>
      <p className="subtitle">
        Sélectionnez les amis avec qui vous voulez jouer
      </p>

      <div className="friends-selection">
        <h3>Mes amis ({friends.length})</h3>
        <div className="friends-list">
          {friends.map((friend) => {
            const isSelected = selectedFriends.some((f) => f.id === friend.id);
            return (
              <div
                key={friend.id}
                className={`friend-item ${isSelected ? "selected" : ""}`}
                onClick={() => toggleFriendSelection(friend)}
              >
                <img src={friend.photo} alt={friend.name} />
                <span>{friend.name}</span>
                <div className="selection-indicator">
                  {isSelected ? "✔️" : "➕"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="selected-summary">
        <h3>Amis sélectionnés ({selectedFriends.length})</h3>
        {selectedFriends.length > 0 ? (
          <div className="selected-list">
            {selectedFriends.map((friend) => (
              <div key={friend.id} className="selected-friend">
                <img src={friend.photo} alt={friend.name} />
                <span>{friend.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-message">Aucun ami sélectionné</p>
        )}
      </div>

      <div className="step-actions">
        <Button
          className="retour"
          onClick={() => navigate("/home/quiz/autoIA")}
        >
          Retour
        </Button>
        <Button
          className="accept"
          onClick={generateMultiQuiz}
          disabled={selectedFriends.length === 0}
        >
          Créer le Quiz ({selectedFriends.length} ami(s))
        </Button>
      </div>
    </div>
  );

  // Rendu étape 2 - Salon d'attente
  const renderStep2 = () => (
    <div className="QuizMultiStep2">
      <h1>{quizData?.title || "Salon d'attente"}</h1>
      <p className="subtitle">
        {isCreator
          ? "👑 Vous êtes le créateur du quiz"
          : "👤 Vous avez rejoint le quiz"}
      </p>

      {isCreator && invitationCode && (
        <div className="invitation-code">
          <h3>Lien d'invitation:</h3>
          <div className="code-display" onClick={copyInvitationCode}>
            <span>start{invitationCode}quiz-IA</span>
            <div className="code-display-copy">
              <Button className="accept">📋 Copier</Button>
            </div>
          </div>
          <p className="code-hint">Partagez ce lien avec vos amis</p>
        </div>
      )}

      <div className="participants-list">
        <h3>Participants ({participants.length})</h3>
        <div className="participants-grid">
          {participants.map((participant) => (
            <div
              key={participant.userId}
              className={`participant-card ${participant.isReady ? "ready" : ""}`}
            >
              <img src={participant.userPhoto} alt={participant.userName} />
              <div className="participant-info">
                <span className="name">{participant.userName}</span>
                <span className="status">
                  {participant.isReady ? "✅ Prêt" : "⏳ En attente"}
                </span>
                {participant.userId === user?.id && (
                  <span className="you">Vous</span>
                )}
                {participant.userId === quizData?.creatorId && (
                  <span className="creator">👑 Créateur</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="waiting-actions">
        {!participants.find((p) => p.userId === user?.id)?.isReady ? (
          <Button className="accept" onClick={markAsReady}>
            Je suis prêt!
          </Button>
        ) : (
          <div className="ready-message">
            <p>✅ Vous êtes prêt à jouer!</p>
          </div>
        )}

        {isCreator && (
          <Button
            className="start-btn"
            onClick={startQuiz}
            disabled={participants.filter((p) => p.isReady).length < 2}
          >
            Démarrer ({participants.filter((p) => p.isReady).length}/
            {participants.length} prêts)
          </Button>
        )}
      </div>
    </div>
  );

  // Rendu étape 3 - Jeu
  const renderStep3 = () => {
    if (!currentQuestion) return null;

    return (
      <div className="HeaderQuiz">
        <div className="game-header">
          <div className="timer">⏱️ {timeLeft}s</div>
          <div className="question-counter">
            Question {currentQuestionIndex}/{totalQuestions}
          </div>
          <div className="current-score">
            Votre score:{" "}
            {participants.find((p) => p.userId === user?.id)?.score || 0}
          </div>
        </div>

        <div className="question-container">
          <h2 className="text-center">{currentQuestion.text}</h2>

          {/* QCM */}
          {currentQuestion.type === "qcm" && currentQuestion.choices && (
            <div className="HeaderQuizOptionBtn">
              {currentQuestion.choices.map((choice, index) => {
                let className = "Quizbtn choice";
                const isSelected = selectedAnswer === choice;

                // Styles pour la correction
                if (showCorrection) {
                  const isCorrectChoice = correctAnswer === choice;
                  if (isCorrectChoice) {
                    className += " accept";
                  } else if (isSelected && !isCorrectChoice) {
                    className += " decline";
                  }
                } else if (isSelected && !isAnswerSubmitted) {
                  className += " accept";
                } else if (isSelected && isAnswerSubmitted) {
                  className += " accept";
                }

                return (
                  <Button
                    key={index}
                    className={className}
                    onClick={() =>
                      !isAnswerSubmitted &&
                      !showCorrection &&
                      setSelectedAnswer(choice)
                    }
                    disabled={isAnswerSubmitted || showCorrection}
                  >
                    {choice}
                  </Button>
                );
              })}
            </div>
          )}

          {/* Question ouverte */}
          {currentQuestion.type === "open" && (
            <div className="open-answer">
              <textarea
                value={(selectedAnswer as string) || ""}
                onChange={(e) =>
                  !isAnswerSubmitted &&
                  !showCorrection &&
                  setSelectedAnswer(e.target.value)
                }
                placeholder="Votre réponse..."
                disabled={isAnswerSubmitted || showCorrection}
                rows={3}
              />
            </div>
          )}

          {/* Choix multiples */}
          {currentQuestion.type === "multiple" && currentQuestion.choices && (
            <div className="multiple-choices">
              {currentQuestion.choices.map((choice, index) => {
                const isSelected = Array.isArray(selectedAnswer)
                  ? selectedAnswer.includes(choice)
                  : false;

                return (
                  <div
                    key={index}
                    className={`multiple-choice ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      if (isAnswerSubmitted || showCorrection) return;
                      setSelectedAnswer((prev) => {
                        const current = Array.isArray(prev) ? prev : [];
                        if (current.includes(choice)) {
                          return current.filter((c) => c !== choice);
                        } else {
                          return [...current, choice];
                        }
                      });
                    }}
                  >
                    <div className="checkbox">{isSelected ? "✓" : ""}</div>
                    <span>{choice}</span>
                  </div>
                );
              })}
            </div>
          )}

          {showCorrection && currentQuestion && (
            <div className="AnswerFeedback">
              <div
                className={`FeedbackBox ${(() => {
                  // Déterminer si la réponse de l'utilisateur était correcte
                  // Utiliser les données reçues via le socket
                  const isAnswerCorrect = correctAnswer === selectedAnswer; // Simplifié, à adapter pour les choix multiples
                  return isAnswerCorrect ? "correct" : "incorrect";
                })()}`}
              >
                <h3>
                  {(() => {
                    const isAnswerCorrect = correctAnswer === selectedAnswer;
                    return isAnswerCorrect ? "✅ Correct!" : "❌ Incorrect";
                  })()}
                </h3>
                <p>
                  <strong>Explication:</strong> {explanation}
                </p>
                {(() => {
                  const isAnswerCorrect = correctAnswer === selectedAnswer;
                  if (!isAnswerCorrect) {
                    return (
                      <p>
                        <strong>Bonne réponse:</strong>{" "}
                        {Array.isArray(correctAnswer)
                          ? correctAnswer.join(", ")
                          : correctAnswer}
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          )}
        </div>

        {/* ACTIONS DU JEU */}
        <div className="game-actions">
          {!isAnswerSubmitted && !showCorrection ? (
            <Button
              className="accept"
              onClick={submitAnswer}
              disabled={!selectedAnswer}
            >
              Soumettre la réponse
            </Button>
          ) : null}

          {/* SEULEMENT UN BOUTON SUIVANT POUR LE CRÉATEUR */}
          {isCreator && showCorrection && (
            <Button className="accept" onClick={nextQuestion}>
              {currentQuestionIndex < totalQuestions
                ? "Question suivante"
                : "Voir les résultats"}
            </Button>
          )}

          {isAnswerSubmitted && !showCorrection && (
            <div className="waiting-next">
              <p>✅ Réponse soumise! En attente de fin du temps {timeLeft}</p>
            </div>
          )}
        </div>

        {/* CLASSEMENT EN DIRECT */}
        {leaderboard.length > 0 && showCorrection && (
          <div className="live-leaderboard">
            <h3>🏆 Classement</h3>
            <div className="leaderboard-list">
              {leaderboard.map((player, index) => (
                <div
                  key={player.userId}
                  className={`leaderboard-item ${player.userId === user?.id ? "current-user" : ""}`}
                >
                  <div className="position">#{index + 1}</div>
                  <img src={player.userPhoto} alt={player.userName} />
                  <div className="player-info">
                    <span className="name">{player.userName}</span>
                  </div>
                  <div className="player-score">{player.score} points</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Rendu étape 4 - Résultats finaux
  const renderStep4 = () => (
    <div className="QuizMultiResults">
      <h1>🎉 Quiz Terminé!</h1>
      <p className="subtitle">{quizData?.title}</p>

      {leaderboard[0] && (
        <div className="winner-section">
          <div className="winner-crown">
            <img src={img1} alt="Couronne de gagnant" />
          </div>
          <img
            src={leaderboard[0].userPhoto}
            alt={leaderboard[0].userName}
            className="winner-avatar"
          />
          <h2>{leaderboard[0].userName}</h2>
          <p className="winner-score">{leaderboard[0].score} points</p>
          <p className="winner-message">Félicitations au grand gagnant!</p>
        </div>
      )}

      <div className="final-leaderboard">
        <h3>Classement Final</h3>
        <div className="leaderboard-final">
          {leaderboard.map((player, index) => {
            let medal = null;
            let rank = true;
            if (index === 0) {
              medal = <img src={img1} alt="" />;
              rank = false;
            } else if (index === 1) {
              medal = <img src={img2} alt="" />;
              rank = false;
            } else if (index === 2) {
              medal = <img src={img3} alt="" />;
              rank = false;
            } else {
              medal = <img src={img4} alt="" />;
              rank = true;
            }

            return (
              <div
                key={player.userId}
                className={`final-item ${player.userId === user?.id ? "highlight" : ""}`}
              >
                <div className="final-position">
                  {medal}
                  {rank && (
                    <span className="rank-number">
                      {index + 1}
                      <sup>e</sup>
                    </span>
                  )}
                </div>
                <img src={player.userPhoto} alt={player.userName} />
                <div className="final-info">
                  <span className="name">{player.userName}</span>
                </div>
                <div className="final-score">{player.score} points</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="final-actions">
        <Button className="retour" onClick={() => navigate("/home")}>
          Accueil
        </Button>
        <Button
          className="accept"
          onClick={() => navigate("/home/quiz/autoIA")}
        >
          Nouveau Quiz
        </Button>
      </div>
    </div>
  );

  return (
    <div className="QuizAutoMulti">
      <div className="quiz-header">
        <Button
          className="retour"
          onClick={() => {
            if (step < 3) {
              navigate("/home/quiz/autoIA");
            } else {
              if (
                window.confirm("Voulez-vous vraiment quitter le quiz en cours?")
              ) {
                navigate("/home");
              }
            }
          }}
        >
          Retour
        </Button>
        <div className="header-info">
          <h1>Quiz Multi-Joueurs IA</h1>
          <p>Mode: {isCreator ? "Créateur" : "Participant"}</p>
        </div>
      </div>

      <div className="quiz-content">
        {isProcessing && renderProcessing()}
        {!isProcessing && isGenerating && renderGenerating()}
        {!isProcessing && !isGenerating && step === 1 && renderStep1()}
        {!isProcessing && !isGenerating && step === 2 && renderStep2()}
        {!isProcessing && !isGenerating && step === 3 && renderStep3()}
        {!isProcessing && !isGenerating && step === 4 && renderStep4()}
      </div>

      {showJoinDialog && !isCreator && !joinedViaCode && !isGenerating && (
        <Dialog open={true} onClose={() => setShowJoinDialog(false)}>
          <DialogContent>
            <DialogContentText>
              <h3 className="text-center">Rejoindre un quiz existant</h3>
              <p className="text-center">
                Vous avez reçu un code d'invitation?
              </p>
              <div className="join-code-input">
                <input
                  type="text"
                  placeholder="Code d'invitation"
                  onChange={(e) => setInvitationCode(e.target.value)}
                  value={invitationCode}
                  style={{ width: "100%", padding: "10px", margin: "10px 0" }}
                />
                <Button
                  className="accept"
                  onClick={() => handleJoinByCode(invitationCode)}
                  disabled={!invitationCode}
                  style={{ width: "100%" }}
                >
                  Rejoindre
                </Button>
              </div>
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowJoinDialog(false)}>
              Créer un quiz
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
};

export default QuizAutoMulti;
