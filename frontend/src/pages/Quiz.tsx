// Quiz.tsx - Version avec position basée sur le score de la partie en cours
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../components/ui/Button";
import "../style/quiz.css";
import a1 from "../assets/avatar/A1.jpg";
import { Avatar, quizDatabase } from "../store/Frontbdd";
import zik1 from "../assets/son/appuiebtn.mp3";
import zik2 from "../assets/son/zikerror.mp3";
import zik3 from "../assets/son/bien.m4a";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import { useAuth } from "../services/AuthContextUser";
import connect from "../services/Util";
import { toast } from "react-toastify";

// Types
type QuizQuestion = (typeof quizDatabase)[keyof typeof quizDatabase][number];

type ScoreEntry = {
  id: string;
  pseudo: string;
  score: number;
  theme: string;
  date: string;
  photo: string;
  position?: number;
  userId?: number;
};

const shuffleOptions = (question: QuizQuestion): QuizQuestion => {
  const optionsWithIndex = question.options.map((option, index) => ({
    option,
    index,
  }));

  const shuffled = [...optionsWithIndex].sort(() => Math.random() - 0.5);
  const newOptions = shuffled.map((o) => o.option);
  const newCorrectAnswer = shuffled.findIndex(
    (o) => o.index === question.correctAnswer,
  );

  return {
    ...question,
    options: newOptions,
    correctAnswer: newCorrectAnswer,
  };
};

const Quiz = () => {
  const { theme } = useParams<{ theme: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // États
  const [avatar, setAvatar] = useState<string | null>(null);
  const [startquiz, setStartquiz] = useState<boolean>(true);
  const [message, setMessage] = useState<string>("");
  const [current, setCurrent] = useState<number>(0);
  const [profil, setProfil] = useState<boolean>(false);
  const [selectoption, setSelectoption] = useState<number | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [correctOption, setCorrectOption] = useState<boolean>(false);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);
  const [finalScore, setFinalScore] = useState<number>(0); // Score de la partie en cours
  const [ranking, setRanking] = useState<ScoreEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [loadingRanking, setLoadingRanking] = useState<boolean>(false);

  // 🔥 ID de la dernière partie jouée
  const [lastGameId, setLastGameId] = useState<string | null>(null);

  // 🔥 États pour la position
  const [userPosition, setUserPosition] = useState<number | null>(null);

  // 🔥 États de debug
  const [debugUserInfo, setDebugUserInfo] = useState<string>("");
  const [debugRankingInfo, setDebugRankingInfo] = useState<string>("");

  const etape = current + 1;
  const questions = theme ? quizDatabase[theme] || [] : [];
  const isLastQuestion = current >= quizQuestions.length - 1;

  // 🔥 Fonction pour calculer la position BASÉE SUR LE SCORE DE LA PARTIE EN COURS
  const calculatePositionForCurrentScore = (
    rankingData: ScoreEntry[],
    currentScore: number,
  ) => {
    if (!user || !user.id) {
      setDebugUserInfo("❌ Utilisateur non connecté");
      setUserPosition(null);
      return;
    }

    if (rankingData.length === 0) {
      setDebugUserInfo("❌ Classement vide");
      setUserPosition(null);
      return;
    }

    // Debug
    const rankingIds = rankingData
      .map((r) => r.userId)
      .filter((id) => id !== undefined);
    setDebugUserInfo(
      `🔍 User ID: ${user.id} | Score actuel: ${currentScore} pts`,
    );
    setDebugRankingInfo(`📊 Ranking IDs: [${rankingIds.join(", ")}]`);

    // 🔥 Calculer la position basée sur le score actuel
    // Compter combien de personnes ont un score SUPÉRIEUR au score actuel
    const higherScores = rankingData.filter(
      (entry) => entry.score > currentScore,
    ).length;

    // La position = nombre de scores supérieurs + 1
    const position = higherScores + 1;

    setUserPosition(position);
    console.log(
      `✅ Position calculée pour ${currentScore} pts: ${position}ème`,
    );
  };

  // 🔥 Charger le classement depuis la BDD
  const loadRankingFromDatabase = async () => {
    if (!theme) return;

    try {
      setLoadingRanking(true);
      const response = await connect.get(`/api/quizzes/ranking/${theme}`);

      if (response.data.success) {
        const formattedRanking = response.data.ranking.map((entry: any) => ({
          id: entry.id.toString(),
          pseudo: entry.pseudo,
          score: entry.score,
          theme: entry.theme,
          date: entry.date,
          photo: entry.photo || a1,
          position: entry.position,
          userId: entry.userId,
        }));

        setRanking(formattedRanking);
        // Calculer la position pour le score actuel
        calculatePositionForCurrentScore(formattedRanking, finalScore);
      }
    } catch (error) {
      console.error("❌ Erreur chargement classement:", error);
      const stored = localStorage.getItem("quizRanking");
      if (stored) {
        const localRanking = JSON.parse(stored);
        const filteredRanking = localRanking.filter(
          (r: ScoreEntry) => r.theme === theme,
        );
        setRanking(filteredRanking);
        calculatePositionForCurrentScore(filteredRanking, finalScore);
      }
    } finally {
      setLoadingRanking(false);
    }
  };

  // 🔥 Sauvegarder le score en BDD
  const saveScoreToDatabase = async (score: number) => {
    if (!user || isSaving) return;

    try {
      setIsSaving(true);

      const response = await connect.post("/api/quizzes/classic/save-result", {
        theme: theme || "inconnu",
        score: score,
        totalQuestions: quizQuestions.length,
      });

      if (response.data.success) {
        toast.success("Score enregistré !");

        if (response.data.quizId) {
          setLastGameId(response.data.quizId.toString());
          console.log("🎮 Dernière partie ID:", response.data.quizId);
        }

        await loadRankingFromDatabase();
      }
    } catch (error) {
      console.error("❌ Erreur sauvegarde score:", error);
      toast.error("Erreur lors de la sauvegarde du score");

      const newId = Date.now().toString();
      const newEntry: ScoreEntry = {
        id: newId,
        pseudo: user?.userName || "Anonyme",
        score,
        theme: theme || "inconnu",
        date: new Date().toLocaleDateString(),
        photo: avatar || a1,
        userId: typeof user?.id === "string" ? parseInt(user.id, 10) : user?.id,
      };

      setLastGameId(newId);

      const stored = localStorage.getItem("quizRanking");
      const localRanking: ScoreEntry[] = stored ? JSON.parse(stored) : [];
      localRanking.push(newEntry);
      localRanking.sort((a, b) => b.score - a.score);
      localStorage.setItem("quizRanking", JSON.stringify(localRanking));

      const filteredRanking = localRanking.filter((r) => r.theme === theme);
      setRanking(filteredRanking);
      calculatePositionForCurrentScore(filteredRanking, score);
    } finally {
      setIsSaving(false);
    }
  };

  // Fonctions utilitaires
  const playSound = (src: string) => {
    const audio = new Audio(src);
    audio.play();
    setTimeout(() => {
      audio.pause();
      audio.currentTime = 0;
    }, 2000);
  };

  const handleback = () => {
    if (!startquiz && !quizFinished) {
      setOpen(true);
    } else {
      navigate("/home");
    }
  };

  const handleselectAvatar = () => {
    const picture = Avatar[Math.floor(Math.random() * Avatar.length)];
    if (picture) {
      setAvatar(picture.avatar);
    } else {
      setAvatar(a1);
    }
  };

  const mixer = <T,>(array: T[]): T[] => {
    return [...array].sort(() => Math.random() - 0.5);
  };

  const takeQuestion = <T,>(array: T[], count: number = 10): T[] => {
    return mixer(array).slice(0, count);
  };

  const getOrdinal = (position: number) => {
    if (position === 1) return "1er";
    if (position === 2) return "2ème";
    if (position === 3) return "3ème";
    return `${position}ème`;
  };

  // Effets
  useEffect(() => {
    handleselectAvatar();
  }, []);

  useEffect(() => {
    if (theme) {
      loadRankingFromDatabase();
    }
  }, [theme]);

  // Recalculer la position quand le score final change
  useEffect(() => {
    if (ranking.length > 0) {
      calculatePositionForCurrentScore(ranking, finalScore);
    }
  }, [finalScore, ranking]);

  useEffect(() => {
    if (questions.length > 0) {
      const selectedQuestions = takeQuestion(questions, 10).map((q) =>
        shuffleOptions(q),
      );
      setQuizQuestions(selectedQuestions);
    }
  }, [theme]);

  useEffect(() => {
    if (!startquiz && etape === 1) {
      setProfil(true);
      setMessage(`joueur ${user?.userName || "dimitri"} c'est parti.`);
    } else if (!startquiz && etape === 3) {
      setProfil(true);
      setMessage(`joueur ${user?.userName || "dimitri"} vous avance bien.`);
    } else if (!startquiz && etape === 5) {
      setProfil(true);
      setMessage(`joueur ${user?.userName || "dimitri"} quel talent.`);
    } else if (!startquiz && etape === 7) {
      setProfil(true);
      setMessage(`joueur ${user?.userName || "dimitri"} vous y êtes presque.`);
    } else if (!startquiz && etape === 9) {
      setProfil(true);
      setMessage(`joueur ${user?.userName || "dimitri"} un dernier effort 😎.`);
    } else {
      setProfil(false);
    }
  }, [etape, startquiz, user?.userName]);

  // Gestion des réponses
  const handlestart = () => {
    setStartquiz(false);
  };

  const handleSelect = (option: number) => {
    if (selectoption || quizFinished) return;

    playSound(zik1);
    setSelectoption(option);

    const currentQuestion = quizQuestions[current];

    if (option === currentQuestion.correctAnswer) {
      playSound(zik3);
      setCorrectOption(false);

      setTimeout(() => {
        const nextScore = finalScore + 1;

        if (isLastQuestion) {
          setProfil(true);
          setMessage(`joueur ${user?.userName || "dimitri"} magnifique 🎉🎉.`);
          setFinalScore(nextScore);

          saveScoreToDatabase(nextScore).then(() => {
            setQuizFinished(true);
          });
        } else {
          setFinalScore(nextScore);
          setCurrent(current + 1);
          setSelectoption(null);
        }
      }, 2000);
    } else {
      playSound(zik2);
      setCorrectOption(true);
      setProfil(true);
      setMessage(`joueur ${user?.userName || "dimitri"} dommage.`);

      setTimeout(() => {
        saveScoreToDatabase(finalScore).then(() => {
          setQuizFinished(true);
          setSelectoption(null);
          setCorrectOption(false);
          setProfil(false);
        });
      }, 2000);
    }
  };

  const handlereset = () => {
    setCurrent(0);
    setSelectoption(null);
    setCorrectOption(false);
    setQuizQuestions(takeQuestion(questions, 10).map(shuffleOptions));
    setProfil(false);
    setQuizFinished(false);
    setFinalScore(0);
    setLastGameId(null);
    setUserPosition(null);
    handleselectAvatar();
    loadRankingFromDatabase();
  };

  return (
    <div className="QuizHeader">
      <div className="QuizHeaderBtn">
        <Button className="retour" onClick={handleback}>
          Retour
        </Button>
        {!startquiz && profil && (
          <div className="QuizWord">
            {avatar && <img src={avatar} alt="" />}
            <h1>{message}</h1>
          </div>
        )}
      </div>

      {!quizFinished ? (
        <div className="">
          {startquiz ? (
            <div className="QuizHeaderTitle">
              {avatar && <img src={avatar} alt="" />}
              <h1>
                Hello {user?.userName || "dimitri"}, on se fait une partie de
                quiz en <span>{theme}</span>{" "}
              </h1>
              <Button className="accept" onClick={handlestart}>
                Commencer le quiz
              </Button>
            </div>
          ) : (
            <div className="HeaderQuiz">
              <div className="">
                <p className="text-center">
                  Question{" "}
                  <span className="text-green-600">
                    {etape < 9 ? "0" + etape : etape}
                  </span>
                  /{quizQuestions.length}
                </p>
              </div>

              <div className="HeaderQuizTitle">
                <h1>{quizQuestions[current].question}</h1>
              </div>

              <div className="HeaderQuizOptionBtn">
                {quizQuestions[current].options.map((p, index) => {
                  const isSelected = index === selectoption;
                  const isCorrect =
                    index === quizQuestions[current].correctAnswer;

                  let className = "Quizbtn choice";
                  if (isSelected) {
                    className += isCorrect ? " accept" : " decline";
                  } else if (isCorrect && correctOption) {
                    className += " accept";
                  }

                  return (
                    <Button
                      className={className}
                      key={index}
                      style={{ width: "100%" }}
                      onClick={() => handleSelect(index)}
                    >
                      {p}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="QuizEnd">
          <h1 className="text-center">🎯 Partie terminée</h1>

          <h2 className="text-center py-2">
            Score : {finalScore} / {quizQuestions.length} (
            {Math.round((finalScore / quizQuestions.length) * 100)}%)
          </h2>

          {/* 🔥 AFFICHAGE DE LA POSITION BASÉE SUR LE SCORE ACTUEL */}
          {userPosition !== null && userPosition > 0 ? (
            <div
              className="text-center font-bold"
              style={{
                fontSize: "1.3rem",
                marginBottom: "20px",
                padding: "10px",
                backgroundColor: "#f0f0f0",
                borderRadius: "8px",
                border: "2px solid #4CAF50",
                color: "#FFD700",
              }}
            >
              🎯 Votre position:{" "}
              <span style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
                {getOrdinal(userPosition)}
              </span>
              <span> (score: {finalScore} pts)</span>
            </div>
          ) : (
            <div
              className="text-center"
              style={{
                marginBottom: "20px",
                padding: "10px",
                backgroundColor: "#ffebee",
                borderRadius: "8px",
                color: "#f44336",
              }}
            >
              {"Position non disponible"}
            </div>
          )}

          <h3 className="text-center">🏆 Classement {theme} </h3>

          {loadingRanking ? (
            <div className="text-center py-4">
              <div className="spinner"></div>
              <p>Chargement du classement...</p>
            </div>
          ) : (
            <div className="ranking">
              {ranking.length > 0 ? (
                ranking.slice(0, 10).map((r, index) => {
                  const isRecentGame = r.id === lastGameId;

                  return (
                    <div
                      className="rankingitem"
                      key={r.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "60px 70px 1fr 80px",
                        alignItems: "center",
                        padding: "12px 16px",
                        borderBottom: "1px solid #e0e0e0",
                        backgroundColor: "#4CAF50",
                      }}
                    >
                      <span>{getOrdinal(index + 1)}</span>
                      <span>
                        <img
                          src={r.photo}
                          alt=""
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                        />
                      </span>
                      <span>{r.pseudo}</span>
                      <span
                        style={{
                          color: isRecentGame ? "#4CAF50" : "inherit",
                          fontWeight: isRecentGame ? "bold" : "normal",
                          fontSize: isRecentGame ? "1.1rem" : "1rem",
                        }}
                      >
                        {r.score} pts
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4">
                  <p>Aucun score enregistré pour ce thème</p>
                  <p className="text-sm text-gray-500">
                    Soyez le premier à jouer !
                  </p>
                </div>
              )}
            </div>
          )}

          <div
            className="RankingBtn"
            style={{
              display: "flex",
              gap: "10px",
              justifyContent: "center",
              marginTop: "20px",
            }}
          >
            <Button className="retour" onClick={() => navigate("/home")}>
              Retour à l’accueil
            </Button>
            <Button className="accept" onClick={handlereset}>
              Recommencer le quiz
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        className="customdialog"
      >
        <DialogContent>
          <DialogContentText className="dialogtext">
            <p>Voulez-vous vraiment quitter la partie ? 🥲</p>
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

export default Quiz;
