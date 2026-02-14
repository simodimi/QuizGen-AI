import React, { useState, useEffect, useRef } from "react";
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

const QuizAutoMulti: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // États principaux
  const [step, setStep] = useState<number>(1);
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

  // ✅ Récupérer le documentId depuis le state de navigation
  useEffect(() => {
    if (location.state) {
      const { documentId: docId, fileName } = location.state as any;
      if (docId) {
        setDocumentId(docId);
        console.log("📄 Document ID reçu:", docId, fileName);
      }
    }
  }, [location]);

  // Récupérer le code depuis l'URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const codeFromUrl = params.get("code");

    if (codeFromUrl) {
      console.log("🔗 Code trouvé dans l'URL:", codeFromUrl);
      setIsCreator(false);
      setInvitationCode(codeFromUrl);
      setStep(2);
      setShowJoinDialog(false);
      setJoinedViaCode(true);
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
      console.log("✅ Socket connecté pour quiz multi");
      setIsConnected(true);
      newSocket.emit("join_user_room", user.id);
    });

    // 📌 RECEVOIR LES INFOS DU QUIZ
    newSocket.on("quiz:quiz_info", (data) => {
      console.log("📋 Infos du quiz reçues:", data);
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

    // 📌 MISE À JOUR DE LA SALLE D'ATTENTE
    /* newSocket.on("quiz:participants_initial", (data) => {
      console.log("📋 Liste initiale des participants reçue:", data);
      newSocket.on("quiz:participants_initial", (data) => {
        const normalized = data.participants.map((p: any) => ({
          ...p,
          userId: Number(p.userId),
        }));
        setParticipants(normalized);
      });
    });*/

    /* newSocket.on("quiz:player_joined", (data) => {
      setParticipants((prev) => {
        const newUserId = Number(data.userId);

        if (prev.some((p) => p.userId === newUserId)) {
          return prev;
        }

        return [
          ...prev,
          {
            userId: newUserId,
            userName: data.userName,
            userPhoto: data.userPhoto,
            isReady: false,
            score: 0,
          },
        ];
      });
    });*/
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
      console.log("❓ Question démarrée:", data);

      // ✅ RÉINITIALISATION COMPLÈTE POUR TOUS LES JOUEURS
      setShowCorrection(false);
      setCorrectAnswer(null);
      setExplanation("");
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);

      // ✅ MÊME QUESTION POUR TOUT LE MONDE
      setCurrentQuestion(data.question);
      setCurrentQuestionIndex(data.questionNumber);
      setTotalQuestions(data.totalQuestions);

      // ✅ DÉMARRER LE TIMER POUR TOUS
      startTimer(data.timeLimit);

      // ✅ PASSER À L'ÉTAPE DU JEU POUR TOUS
      setStep(3);

      toast.info(`Question ${data.questionNumber}/${data.totalQuestions}`);
    });

    /* // 📌 RÉSULTAT INDIVIDUEL DE LA RÉPONSE
    newSocket.on("quiz:answer_result", (data) => {
      console.log("🎯 Résultat réponse:", data);
      toast.success(
        data.isCorrect
          ? `✅ Bonne réponse ! +${data.scoreEarned} points`
          : `❌ Mauvaise réponse.`,
      );
    });*/
    // Dans le useEffect du socket, modifiez le handler quiz:answer_result
    newSocket.on("quiz:answer_result", (data) => {
      console.log("🎯 Résultat réponse:", data);
      toast.success(
        data.isCorrect
          ? `✅ Bonne réponse ! +${data.scoreEarned} points`
          : `❌ Mauvaise réponse.`,
      );

      // ✅ AJOUT: Enregistrer la réponse de l'utilisateur
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

    // 📌 MISE À JOUR DU CLASSEMENT EN DIRECT
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

    // 📌 AFFICHAGE AUTOMATIQUE DE LA CORRECTION
    newSocket.on("quiz:show_correction", (data) => {
      console.log("📚 Correction reçue:", data);
      setShowCorrection(true);
      setCorrectAnswer(data.correctAnswer);
      setExplanation(data.explanation);
      setLeaderboard(data.leaderboard);
      if (data.autoTriggered) {
        toast.info("⏰ Temps écoulé ! Voici la correction.");
      }
    });

    // 📌 TEMPS ÉCOULÉ
    newSocket.on("quiz:time_up", (data) => {
      console.log("⏰ Temps écoulé:", data);
      setTimeLeft(0);
      toast.warning("⏰ Temps écoulé !");
    });

    // 📌 QUIZ TERMINÉ
    newSocket.on("quiz:ended", (data) => {
      console.log("🏁 Quiz terminé:", data);
      setStep(4);
      setLeaderboard(data.leaderboard);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    });

    // 📌 ERREURS
    newSocket.on("quiz:join_error", (data) => {
      toast.error(data.message);
    });

    newSocket.on("quiz:start_error", (data) => {
      toast.error(data.message);
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ Erreur connexion Socket:", error);
      toast.error("Erreur de connexion au serveur");
    });

    return () => {
      if (newSocket) newSocket.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user?.id, isCreator]);

  // 🔥 REJOINDRE UN QUIZ
  const handleJoinByCode = async (code: string) => {
    if (!socket || !user) {
      toast.error("Connexion au serveur en cours...");
      return;
    }

    if (!code) {
      toast.error("Code d'invitation invalide");
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
        // setParticipants([]);

        // ✅ REJOINDRE LA ROOM SOCKET
        socket.emit("join_quiz_room", { quizId });
        socket.emit("quiz:join_by_code", { invitationCode: code });

        toast.success("✅ Vous avez rejoint le quiz!");
      }
    } catch (error: any) {
      console.error("❌ Erreur rejoindre quiz:", error);
      toast.error(
        error.response?.data?.message || "Impossible de rejoindre le quiz",
      );
    }
  };

  // 🔥 MARQUER COMME PRÊT
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

  // 🔥 GÉNÉRER QUIZ MULTI - AVEC DOCUMENTID DU STATE
  const generateMultiQuiz = async () => {
    if (selectedFriends.length === 0) {
      toast.error("Veuillez sélectionner au moins un ami");
      return;
    }

    if (!documentId) {
      toast.error("Aucun document trouvé");
      navigate("/home/quiz/autoIA");
      return;
    }

    try {
      const response = await connect.post(`/api/quizzes/ai/${documentId}`, {
        mode: "multi",
        difficulty: "medium",
        selectedFriends: selectedFriends.map((f) => f.id),
      });

      if (response.data.success) {
        const quizId = response.data.quizId;
        const code = response.data.invitationCode;

        // ✅ RÉCUPÉRER LE TITRE DEPUIS LE BACKEND
        const title = `Quiz multi - ${response.data.documentType || "document"}`;

        setQuizData({
          id: quizId,
          title: title,
          questions: [],
          questionCount: response.data.questionCount,
          status: "waiting",
          invitationCode: code,
          creatorId: Number(user!.id),
          documentId: documentId,
        });

        setInvitationCode(code);
        setStep(2);
        setIsCreator(true);

        // Rejoindre la room
        if (socket) {
          socket.emit("join_quiz_room", { quizId });
        }

        /* // Inviter les amis
        if (socket) {
          socket.emit("quiz:invite_friends", {
            quizId,
            friendIds: selectedFriends.map((f) => f.id),
          });
        }*/

        const invitationLink = `start${code}quiz-IA`;

        // Envoyer les messages
        for (const friend of selectedFriends) {
          try {
            await connect.post("/api/messages", {
              receiverId: friend.id,
              content: `${user!.userName} vous invite à un quiz "${title}"!\n\nCliquez sur ce lien pour rejoindre:\n${invitationLink}`,
              messageType: "quiz_invitation",
            });
          } catch (error) {
            console.error(`Erreur envoi message à ${friend.name}:`, error);
          }
        }

        toast.success("✅ Quiz créé! Les invitations ont été envoyées.");
      }
    } catch (error) {
      console.error("Erreur génération quiz:", error);
      toast.error("Erreur lors de la création du quiz");
    }
  };

  // 🔥 DÉMARRER LE QUIZ
  const startQuiz = () => {
    if (!socket || !quizData || !isCreator) return;

    const readyCount = participants.filter((p) => p.isReady).length;
    if (readyCount < 2) {
      toast.warning("Attendez qu'au moins un autre joueur soit prêt");
      return;
    }

    socket.emit("quiz:multi_start", { quizId: quizData.id });
  };

  // 🔥 PASSER À LA QUESTION SUIVANTE (Créateur uniquement)
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

  // 🔥 SOUMETTRE UNE RÉPONSE
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
    const link = `${window.location.origin}/home/quiz/multi?code=${invitationCode}`;
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
            <span>
              {window.location.origin}/home/multi?code={invitationCode}
            </span>
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

          {/* ✅ SEULEMENT UN BOUTON SUIVANT POUR LE CRÉATEUR */}
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
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </div>

      {showJoinDialog && !isCreator && step === 1 && (
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
