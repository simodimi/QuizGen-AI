import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import Button from "../components/ui/Button";
import img1 from "../assets/icone/un.png";
import img2 from "../assets/icone/deux.png";
import img3 from "../assets/icone/trois.png";
import img4 from "../assets/icone/oth.png";
import "../style/doc.css";
import { useAuth } from "../services/AuthContextUser";
import connect from "../services/Util";
import { toast } from "react-toastify";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import logo1 from "../assets/icone/logo.png";
import logo2 from "../assets/icone/lib.png";

// Types - CORRIGÉS pour correspondre à ce que le serveur envoie
interface RankingPlayer {
  position: number;
  userId: number;
  userName: string;
  userPhoto: string;
  score: number;
}

interface QuizHistoryItem {
  id: number;
  quizId: number;
  quizTitle: string;
  quizType: "classic" | "ia-solo" | "ia-multi";
  mode: "solo" | "multi";
  theme: string | null;
  score: number;
  totalQuestions: number;
  percentage: number;
  position: number | null;
  completedAt: string;
  document: {
    id: number;
    fileName: string;
    originalName?: string;
  } | null;
  creator: {
    id: number;
    userName: string;
    userPhoto: string;
  } | null;
  ranking: RankingPlayer[]; // Tableau de joueurs avec leurs scores
  userRank: number | null;
}

interface GlobalStats {
  totalGames: number;
  totalScore: number;
  averageScore: number;
  bestScore: number;
}

interface Pagination {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
}

const Result = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [history, setHistory] = useState<QuizHistoryItem[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats>({
    totalGames: 0,
    totalScore: 0,
    averageScore: 0,
    bestScore: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<string>("all");
  const [selectedQuiz, setSelectedQuiz] = useState<QuizHistoryItem | null>(
    null,
  );
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [showsmsg, setShowMsg] = useState<boolean>(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    totalPages: 1,
    total: 0,
    limit: 10,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowMsg(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Charger l'historique
  const loadHistory = async (page = 1) => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await connect.get(
        `/api/my-quizzes/history?type=${filter}&page=${page}&limit=10`,
      );

      if (response.data.success) {
        console.log(" Historique reçu:", response.data.history);
        setHistory(response.data.history);
        setGlobalStats(response.data.globalStats);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error(" Erreur chargement historique:", error);
      toast.error("Impossible de charger l'historique");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [user, filter]);

  // Formater la date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
    } catch {
      return dateString;
    }
  };

  //  Obtenir l'icône de médaille selon la position
  const getMedalIcon = (position: number) => {
    if (position === 1)
      return <img src={img1} alt="Or" className="medal-icon" />;
    if (position === 2)
      return <img src={img2} alt="Argent" className="medal-icon" />;
    if (position === 3)
      return <img src={img3} alt="Bronze" className="medal-icon" />;
    return <img src={img4} alt="Participant" className="medal-icon" />;
  };

  // Obtenir la classe CSS pour le score
  const getScoreClass = (percentage: number) => {
    if (percentage >= 80) return "score-excellent";
    if (percentage >= 60) return "score-good";
    if (percentage >= 40) return "score-average";
    return "score-poor";
  };

  // Obtenir l'icône du type de quiz
  const getQuizTypeIcon = (type: string) => {
    switch (type) {
      case "classic":
        return <img src={logo2} alt="Classique" className="type-icon" />;
      case "ia-solo":
        return <img src={logo1} alt="IA Solo" className="type-icon" />;
      case "ia-multi":
        return (
          <div className="multi-icon">
            <img src={logo1} alt="IA" className="type-icon" />
            <img src={logo1} alt="IA" className="type-icon" />
          </div>
        );
      default:
        return "❓";
    }
  };

  // Obtenir le libellé du type
  const getQuizTypeLabel = (type: string) => {
    switch (type) {
      case "classic":
        return "Quiz Classique";
      case "ia-solo":
        return "Quiz IA Solo";
      case "ia-multi":
        return "Quiz IA Multi";
      default:
        return "Quiz";
    }
  };

  //  Ouvrir les détails d'un quiz
  const openQuizDetails = (quiz: QuizHistoryItem) => {
    setSelectedQuiz(quiz);
    setOpenDialog(true);
  };

  if (loading && history.length === 0) {
    return (
      <div className="QuizHeader">
        <div className="QuizHeaderBtn">
          <Button className="retour" onClick={() => navigate("/home")}>
            Retour
          </Button>
        </div>
        <div className="LoadingQuiz">
          <div className="spinner"></div>
          <h2>Chargement de votre historique...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="QuizHeader result-page">
      <div className="QuizHeaderBtn">
        <Button className="retour" onClick={() => navigate("/home")}>
          Retour
        </Button>
        <div className="QuizWord">
          {user?.userPhoto && <img src={user.userPhoto} alt={user.userName} />}
          {showsmsg && <h1>Hello {user?.userName}, voici vos résultats</h1>}
        </div>
      </div>

      {/* Statistiques globales */}
      <div className="global-stats">
        <div className="stat-card">
          <span className="stat-value">{globalStats.totalGames}</span>
          <span className="stat-label">Parties jouées</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{globalStats.totalScore}</span>
          <span className="stat-label">Points totaux</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            {globalStats.averageScore.toFixed(1)}
          </span>
          <span className="stat-label">Moyenne/partie</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{globalStats.bestScore}</span>
          <span className="stat-label">Meilleur score</span>
        </div>
      </div>

      {/* Filtres */}
      <div className="result-filters">
        <p
          className={`filter-btn ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          Tous
        </p>
        <p
          className={`filter-btn ${filter === "classic" ? "active" : ""}`}
          onClick={() => setFilter("classic")}
        >
          <img src={logo2} alt="" /> &nbsp; Classiques
        </p>
        <p
          className={`filter-btn ${filter === "ia-solo" ? "active" : ""}`}
          onClick={() => setFilter("ia-solo")}
        >
          <img src={logo1} alt="" /> IA Solo
        </p>
        <p
          className={`filter-btn ${filter === "ia-multi" ? "active" : ""}`}
          onClick={() => setFilter("ia-multi")}
        >
          <img src={logo1} alt="" />
          <img src={logo1} alt="" /> IA Multi
        </p>
      </div>

      {/* Liste des résultats */}
      <div className="results-list">
        {history.length === 0 ? (
          <div className="empty-results">
            <p>Aucun résultat pour le moment</p>
            <Button
              className="accept"
              onClick={() => navigate("/home/quiz/autoIA")}
            >
              Faire un quiz IA
            </Button>
          </div>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              className={`result-card ${item.quizType} ${item.mode === "multi" ? "multi-card" : ""}`}
              onClick={() => openQuizDetails(item)}
            >
              <div className="result-header">
                <div className="result-type-icon">
                  {getQuizTypeIcon(item.quizType)}
                </div>
                <div className="result-title">
                  <h3>{item.quizTitle}</h3>
                  <span className="result-type">
                    {getQuizTypeLabel(item.quizType)}
                  </span>
                </div>
                <div
                  className={`result-score ${getScoreClass(item.percentage)}`}
                >
                  <span className="score-value">{item.score}</span>
                  <span className="score-total">/{item.totalQuestions}</span>
                  <span className="score-percentage">({item.percentage}%)</span>
                </div>
              </div>

              <div className="result-details">
                <div className="result-date">
                  📅 {formatDate(item.completedAt)}
                </div>
                {item.document && (
                  <div className="result-document">
                    📄 Document: {item.document.fileName}
                  </div>
                )}
                {item.mode === "multi" && item.position && (
                  <div className="result-position">
                    🏆 Position: <strong>{item.position}e</strong> sur{" "}
                    {item.ranking?.length || 0}
                  </div>
                )}
              </div>

              {/*  Classement pour les multi - Version améliorée */}
              {item.mode === "multi" &&
                item.ranking &&
                item.ranking.length > 0 && (
                  <div className="result-ranking-preview">
                    <h4>🏆 Classement :</h4>
                    <div className="ranking-mini">
                      {item.ranking.slice(0, 3).map((player, idx) => (
                        <div
                          key={idx}
                          className={`ranking-mini-item ${player.userId === user?.id ? "current-user" : ""}`}
                        >
                          {getMedalIcon(player.position)}
                          <img
                            src={player.userPhoto || "/default-avatar.png"}
                            alt={player.userName}
                            className="mini-avatar"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "/default-avatar.png";
                            }}
                          />
                          <span className="mini-name">{player.userName}</span>
                          <span className="mini-score">{player.score} pts</span>
                        </div>
                      ))}
                      {item.ranking.length > 3 && (
                        <div className="ranking-more">
                          +{item.ranking.length - 3} autres
                        </div>
                      )}
                    </div>
                  </div>
                )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <Button
            className="retour"
            disabled={pagination.page === 1}
            onClick={() => loadHistory(pagination.page - 1)}
          >
            Précédent
          </Button>
          <span>
            Page {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            className="accept"
            disabled={pagination.page === pagination.totalPages}
            onClick={() => loadHistory(pagination.page + 1)}
          >
            Suivant
          </Button>
        </div>
      )}

      {/*  Dialog des détails complets - Version améliorée pour le multi */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
        className="result-dialog"
      >
        {selectedQuiz && (
          <>
            <DialogContent>
              <DialogContentText component="div">
                <div className="dialog-header">
                  <h2>{selectedQuiz.quizTitle}</h2>
                  <span className={`quiz-type-badge ${selectedQuiz.quizType}`}>
                    {getQuizTypeLabel(selectedQuiz.quizType)}
                  </span>
                </div>

                <div className="dialog-score-summary">
                  <div className="big-score">
                    {selectedQuiz.score} / {selectedQuiz.totalQuestions}
                  </div>
                  <div className="big-percentage">
                    {selectedQuiz.percentage}%
                  </div>
                </div>

                <div className="dialog-info">
                  <p>
                    <strong>📅 Date :</strong>{" "}
                    {formatDate(selectedQuiz.completedAt)}
                  </p>
                  {selectedQuiz.theme && (
                    <p>
                      <strong>🎯 Thème :</strong> {selectedQuiz.theme}
                    </p>
                  )}
                  {selectedQuiz.document && (
                    <p>
                      <strong>📄 Document :</strong>{" "}
                      {selectedQuiz.document.fileName}
                    </p>
                  )}
                  {selectedQuiz.creator && (
                    <p>
                      <strong>👤 Créateur :</strong>{" "}
                      {selectedQuiz.creator.userName}
                    </p>
                  )}
                  {selectedQuiz.mode === "multi" && selectedQuiz.position && (
                    <p>
                      <strong>🏆 Votre position :</strong>{" "}
                      {selectedQuiz.position}e
                    </p>
                  )}
                </div>

                {/*  Classement complet pour les multi - Version améliorée */}
                {selectedQuiz.mode === "multi" &&
                  selectedQuiz.ranking &&
                  selectedQuiz.ranking.length > 0 && (
                    <div className="full-ranking">
                      <h3>🏆 Classement complet</h3>
                      <div className="ranking-list">
                        {selectedQuiz.ranking
                          .sort((a, b) => a.position - b.position)
                          .map((player, index) => (
                            <div
                              key={index}
                              className={`ranking-item ${player.userId === user?.id ? "current-user-highlight" : ""}`}
                            >
                              <div className="rank-position">
                                {getMedalIcon(player.position)}
                                <span className="position-number">
                                  {player.position}e
                                </span>
                              </div>
                              <img
                                src={player.userPhoto || "/default-avatar.png"}
                                alt={player.userName}
                                className="rank-avatar"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    "/default-avatar.png";
                                }}
                              />
                              <div className="rank-name">{player.userName}</div>
                              <div className="rank-score">
                                {player.score} pts
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
              </DialogContentText>
            </DialogContent>
            <DialogActions className="dialogQuiz">
              <Button onClick={() => setOpenDialog(false)} className="retour">
                Fermer
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </div>
  );
};

export default Result;
