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

type QuizQuestion = (typeof quizDatabase)[keyof typeof quizDatabase][number];

const shuffleOptions = (question: QuizQuestion): QuizQuestion => {
  const optionsWithIndex = question.options.map((option, index) => ({
    option,
    index,
  }));

  const shuffled = [...optionsWithIndex].sort(() => Math.random() - 0.5);

  const newOptions = shuffled.map((o) => o.option);
  const newCorrectAnswer = shuffled.findIndex(
    (o) => o.index === question.correctAnswer
  );

  return {
    ...question,
    options: newOptions,
    correctAnswer: newCorrectAnswer,
  };
};

const Quiz = () => {
  const { theme } = useParams<{ theme: string }>();
  const [avatar, setavatar] = useState<string | null>(null);
  const [startquiz, setstartquiz] = useState<boolean>(true);
  const [message, setmessage] = useState<string>("");
  const [current, setcurrent] = useState<number>(0);
  const [profil, setprofil] = useState<boolean>(false);
  const [selectoption, setselectoption] = useState<number | null>(null);
  const etape = current + 1;
  const navigate = useNavigate();
  const questions = theme ? quizDatabase[theme] || [] : [];
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [correctOption, setcorrectOption] = useState<boolean>(false);
  const isLastQuestion = current >= quizQuestions.length - 1;
  const [quizFinished, setquizFinished] = useState<boolean>(false);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [ranking, setRanking] = useState<ScoreEntry[]>([]);
  const [open, setOpen] = useState(false);
  type ScoreEntry = {
    pseudo: string;
    score: number;
    theme: string;
    date: string;
    photo: string;
  };
  const saveScore = (score: number) => {
    const newEntry: ScoreEntry = {
      pseudo: "dimitri",
      score,
      theme: theme || "inconnu",
      date: new Date().toLocaleDateString(),
      photo: avatar || a1,
    };

    const stored = localStorage.getItem("quizRanking");
    const ranking: ScoreEntry[] = stored ? JSON.parse(stored) : [];

    ranking.push(newEntry);

    ranking.sort((a, b) => b.score - a.score);

    localStorage.setItem("quizRanking", JSON.stringify(ranking));
  };

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
      setavatar(picture.avatar);
    } else {
      setavatar(a1);
    }
  };
  useEffect(() => {
    handleselectAvatar();
  }, []);
  const handlestart = () => {
    setstartquiz(false);
  };
  //function pour melanger les questions par theme
  const mixer = <T,>(array: T[]): T[] => {
    return [...array].sort(() => Math.random() - 0.5);
  };
  //fonction pour avoir 10questions
  const takeQuestion = <T,>(array: T[], count: number = 10): T[] => {
    return mixer(array).slice(0, count);
  };
  //aleatoire les reponses
  useEffect(() => {
    if (questions.length > 0) {
      const selectedQuestions = takeQuestion(questions, 10).map((q) =>
        shuffleOptions(q)
      );
      setQuizQuestions(selectedQuestions);
    }
  }, [theme]);
  useEffect(() => {
    if (!startquiz && etape === 1) {
      setprofil(true);
      setmessage("joueur dimitri c'est parti.");
    } else if (!startquiz && etape === 3) {
      setprofil(true);
      setmessage("joueur dimitri vous avance bien.");
    } else if (!startquiz && etape === 5) {
      setprofil(true);
      setmessage("joueur dimitri quel talent.");
    } else if (!startquiz && etape === 7) {
      setprofil(true);
      setmessage("joueur dimitri vous y êtes presque.");
    } else if (!startquiz && etape === 9) {
      setprofil(true);
      setmessage("joueur dimitri un dernier effort 😎.");
    } else {
      setprofil(false);
    }
  }, [etape, startquiz]);
  /* const handleSelect = (option: number) => {
    if (selectoption || quizFinished) {
      return;
    }
    playSound(zik1);
    setselectoption(option);
    if (option === quizQuestions[current].correctAnswer) {
      playSound(zik3);
      setcorrectOption(false);
      setTimeout(() => {
        setcurrent(current + 1);
        setselectoption(null);
        if (isLastQuestion) {
          const score = finalScore + 1;
          setFinalScore(score);
          saveScore(score);
           const stored = localStorage.getItem("quizRanking");
  if (stored) setRanking(JSON.parse(stored));
          setquizFinished(true);
        } else {
          setFinalScore(finalScore + 1);
        }
      }, 2000);
    } else {
      setprofil(true);
      setmessage("joueur dimitri dommage.");
      playSound(zik2);
      setcorrectOption(true);
      setTimeout(() => {
        setcurrent(0);
        setselectoption(null);
        setcorrectOption(false);
        setQuizQuestions(takeQuestion(questions, 10).map(shuffleOptions));
        setprofil(false);
        setquizFinished(true);
        saveScore(finalScore);
      }, 2000);
      setFinalScore(finalScore);
    }
  };*/
  const handleSelect = (option: number) => {
    if (selectoption || quizFinished) return;

    playSound(zik1);
    setselectoption(option);

    const currentQuestion = quizQuestions[current];

    if (option === currentQuestion.correctAnswer) {
      // Bonne réponse
      playSound(zik3);
      setcorrectOption(false);

      setTimeout(() => {
        const nextScore = finalScore + 1;

        if (isLastQuestion) {
          //  (victoire)
          setprofil(true);
          setmessage("joueur dimitri magnifique 🎉🎉.");
          setFinalScore(nextScore); // Met à jour le score final
          saveScore(nextScore); // Sauvegarde dans localStorage
          // Charger directement le classement
          const stored = localStorage.getItem("quizRanking");
          if (stored) setRanking(JSON.parse(stored));
          setquizFinished(true); // Affiche l'écran de fin
        } else {
          // Question suivante
          setFinalScore(nextScore);
          setcurrent(current + 1);
          setselectoption(null);
        }
      }, 2000);
    } else {
      // Mauvaise réponse -> PERDU
      playSound(zik2);
      setcorrectOption(true);
      setprofil(true);
      setmessage("joueur dimitri dommage.");
      setTimeout(() => {
        // On sauvegarde le score actuel
        saveScore(finalScore);
        // Charger le classement
        const stored = localStorage.getItem("quizRanking");
        if (stored) setRanking(JSON.parse(stored));
        // On affiche l'écran de fin
        setquizFinished(true);
        // On ne réinitialise pas le quiz ici pour permettre l'affichage du classement
        setselectoption(null);
        setcorrectOption(false);
        setprofil(false);
      }, 2000);
    }
  };

  useEffect(() => {
    if (quizFinished) {
      const stored = localStorage.getItem("quizRanking");
      if (stored) {
        setRanking(JSON.parse(stored));
      }
    }
  }, [quizFinished]);
  const handlereset = () => {
    setcurrent(0);
    setselectoption(null);
    setcorrectOption(false);
    setQuizQuestions(takeQuestion(questions, 10).map(shuffleOptions));
    setprofil(false);
    setquizFinished(false);
    setFinalScore(0);
    handleselectAvatar();
  };
  const getOrdinal = (position: number) => {
    if (position === 1) return "1er";
    if (position === 2) return "2eme";
    if (position === 3) return "3eme";
    return `${position}eme`;
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
                Hello dimitri,on se fait une partie de quiz en{" "}
                <span>{theme}</span>{" "}
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
                      style={{
                        width: "100%",
                      }}
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
          <h2 className="text-center">Score : {finalScore} / 10</h2>
          <h3 className="text-center">🏆 Classement {theme} </h3>
          <div className="ranking">
            {ranking.slice(0, 10).map((r, index) => (
              <div className="rankingitem" key={index}>
                <span>{getOrdinal(index + 1)}</span>
                <span>
                  <img src={r.photo} alt="" />
                </span>
                <span>{r.pseudo}</span>
                <span>{r.score} pts</span>
              </div>
            ))}
          </div>
          <div className="RankingBtn">
            <Button className="retour" onClick={() => navigate("/home")}>
              Retour à l’accueil
            </Button>
            <Button className="accept" onClick={handlereset}>
              Recommencer le quiz
            </Button>
          </div>
        </div>
      )}

      {open && (
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          className="customdialog"
        >
          <DialogContent>
            <DialogContentText className="dialogtext">
              <p>voulez vous vraiment quitter la partie 🥲</p>
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
              confirmer
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
};

export default Quiz;
