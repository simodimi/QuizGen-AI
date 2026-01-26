import { useEffect, useRef, useState } from "react";
import Button from "../components/ui/Button";
import { useNavigate } from "react-router-dom";
import a1 from "../assets/icone/logo.png";
import { Avatar } from "../store/Frontbdd";
import vd from "../assets/Vd.mp4";
import "../style/quiz.css";

const QuizAuto = () => {
  const [nextstep, setnextstep] = useState<boolean>(false);
  const [avatar, setavatar] = useState<string | null>(null);
  const [startquiz, setstartquiz] = useState<boolean>(true);
  const [message, setmessage] = useState<string>("");
  const [profil, setprofil] = useState<boolean>(false);
  const selectfile = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const navigate = useNavigate();
  const handleback = () => {
    navigate("/home");
  };

  const handlestart = () => {
    setnextstep(true);
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
  const handlechange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setIsLoading(true);
      setFileName(null);
      return;
    }
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setFileName(file.name);
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    }
  };
  const handleNewDocument = () => {
    if (selectfile.current) {
      selectfile.current.click();
    }
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
      {!nextstep ? (
        <div className="QuizHeaderTitles">
          <img src={a1} alt="" />
          <h1>Hello dimitri,tu veux générer ton propre quiz</h1>
          <Button className="accept" onClick={handlestart}>
            Allez suis moi 🤖
          </Button>
        </div>
      ) : (
        <div className="QuizHeaderVideo">
          <div className="HomeHeaderVideoQuiz">
            <video src={vd} loop autoPlay muted playsInline />
          </div>
          <div className="HomeHeaderFile">
            <span onClick={() => selectfile.current?.click()}>
              {!fileName && !isLoading && (
                <div className="">cliquez ici pour ajouter un fichier</div>
              )}
              {isLoading && <p>chargement...</p>}
              {fileName && !isLoading && <p>{fileName}</p>}
            </span>
            <input
              type="file"
              ref={selectfile}
              onChange={handlechange}
              name=""
              id=""
              style={{ display: "none" }}
            />
            {fileName && (
              <div className="QuizHeaderIABtn">
                <Button className="accept" onClick={handleNewDocument}>
                  Changer de document
                </Button>
                <Button className="retour">Générer un quiz</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizAuto;
