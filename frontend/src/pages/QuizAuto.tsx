import { useEffect, useRef, useState } from "react";
import Button from "../components/ui/Button";
import { useNavigate } from "react-router-dom";
import a1 from "../assets/icone/logo.png";
import { Avatar } from "../store/Frontbdd";
import vd from "../assets/Vd.mp4";
import "../style/quiz.css";
import connect from "../services/Util";
import { useAuth } from "../services/AuthContextUser";
const QuizAuto = () => {
  const [avatar, setavatar] = useState<string | null>(null);
  const [startquiz] = useState<boolean>(true);
  const [message] = useState<string>("");
  const [profil] = useState<boolean>(false);
  const selectfile = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [storefile, setstorefile] = useState<File | null>(null);
  const [step1, setstep1] = useState<boolean>(true);
  const [step2, setstep2] = useState<boolean>(false);
  const [step3, setstep3] = useState<boolean>(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const handleback = () => {
    if (step2) {
      setstep2(false);
      setstep1(true);
      setstep3(false);
    }
    if (step1) {
      navigate(-1);
    }
    if (step3) {
      setstep3(false);
      setstep2(true);
      setstep1(false);
    }
  };

  const handlestart = () => {
    setstep2(true);
    setstep1(false);
    setstep3(false);
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
        setstorefile(file);
      };
      reader.readAsDataURL(file);
    }
  };
  const handleNewDocument = () => {
    if (selectfile.current) {
      selectfile.current.click();
    }
  };
  const handlenext = () => {
    setstep3(true);
    setstep2(false);
    setstep1(false);
  };
  const handlesoloplay = async () => {
    if (!storefile) {
      return;
    }
    try {
      const formdata = new FormData();
      formdata.append("file", storefile);
      const res = await connect.post("/api/documents/", formdata);
      if (res.status === 201) {
        console.log("Document envoyé avec succès");

        // ✅ STOCKER DANS LE STATE, PAS DANS LOCALSTORAGE
        // Naviguer vers la page QuizAutoSolo avec le documentId
        navigate("/home/solo", {
          state: {
            documentId: res.data.document.id,
            fileName: res.data.document.fileName,
          },
        });
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi du document:", error);
    }
  };
  const handlemultiplay = async () => {
    if (!storefile) {
      return;
    }
    //liste d'amis sélectionnés
    const selectedFriends: Array<{ id: string; name: string }> = [];
    try {
      const formdata = new FormData();
      formdata.append("file", storefile);
      const res = await connect.post("/api/documents/", formdata);
      if (res.status === 201) {
        console.log("Document envoyé avec succès");

        navigate("/home/multi", {
          state: {
            documentId: res.data.document.id,
            fileName: res.data.document.fileName,
          },
        });
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi du document:", error);
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
      {step1 && (
        <div className="QuizHeaderTitles">
          <img src={a1} alt="" />
          <h1>Hello {user?.userName}, tu veux générer ton propre quiz</h1>
          <Button className="accept" onClick={handlestart}>
            Allez suis moi 🤖
          </Button>
        </div>
      )}
      {step2 && (
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
              {fileName && !isLoading && (
                <p className="text-center">{fileName}</p>
              )}
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
                <Button className="retour" onClick={handlenext}>
                  Générer un quiz
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      {step3 && (
        <div className="QuizHeaderTitles">
          <img src={a1} alt="" />
          <h1>Hello {user?.userName},tu veux quoi?</h1>
          <div className="flex gap-7">
            <Button className="retour" onClick={handlesoloplay}>
              Jouer en mode solo
            </Button>
            <Button className="accept" onClick={handlemultiplay}>
              Jouer en mode multi
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizAuto;
