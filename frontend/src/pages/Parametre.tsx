import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  useEffect,
} from "react";
import Button from "../components/ui/Button";
import no from "../assets/para/no.jpg";
import plus from "../assets/para/plus.png";
import "../style/para.css";
import eye from "../assets/icone/ouvert.png";
import eyeClose from "../assets/icone/fermé.png";
import { Avatar, Background, Police } from "../store/Frontbdd";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import pleure from "../assets/para/pleure.png";
import down from "../assets/para/down.png";
import up from "../assets/para/up.png";
import { useAuth } from "../services/AuthContextUser";
import connect from "../services/Util";
import { toast } from "react-toastify";
const Parametre = () => {
  const [picture, setpicture] = useState<string | null>(null);
  const [picturebg, setpicturebg] = useState<string | null>(null);

  const { user, setUser, logout } = useAuth();
  const [avatar, setavatar] = useState<string | null>(`${user?.userPhoto}`);
  const [selectedDefaultAvatar, setSelectedDefaultAvatar] = useState<
    string | null
  >(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [message] = useState<string>(`Hello ${user?.userName},🛠️`);
  const [policetexte, setpolicetexte] = useState<string>(
    `${user?.policeStyle}` || "Roboto",
  );
  const [open, setOpen] = useState<boolean>(false);
  const [startquiz, setstartquiz] = useState<boolean>(true);
  const [disabling, setdisabling] = useState<boolean>(true);
  const [disabling1, setdisabling1] = useState<boolean>(true);
  const [selectedDefaultBg, setSelectedDefaultBg] = useState<string | null>(
    null,
  );
  const [removeBgPending, setRemoveBgPending] = useState(false);
  const [passtype, setpasstype] = useState<"password" | "text">("password");
  const [passtype1, setpasstype1] = useState<"password" | "text">("password");
  const [showeye, setshoweye] = useState<boolean>(false);
  const [showeye1, setshoweye1] = useState<boolean>(false);
  const [choice1, setchoice1] = useState<boolean>(true);
  const [choice2, setchoice2] = useState<boolean>(true);
  const [choice3, setchoice3] = useState<boolean>(true);
  const [choice4, setchoice4] = useState<boolean>(true);
  const [choice5, setchoice5] = useState<boolean>(true);
  const [choice6, setchoice6] = useState<boolean>(true);
  const [choicePara1, setchoicePara1] = useState<boolean>(false);
  const [choicePara2, setchoicePara2] = useState<boolean>(false);
  const [choicePara3, setchoicePara3] = useState<boolean>(false);
  const [choicePara4, setchoicePara4] = useState<boolean>(false);
  const [choicePara5, setchoicePara5] = useState<boolean>(false);
  const [choicePara6, setchoicePara6] = useState<boolean>(false);

  interface Hidden {
    id: string;
    open: boolean;
  }
  const [hide, sethide] = useState<Hidden[]>([
    { id: "1", open: true },
    { id: "2", open: false },
    { id: "3", open: false },
    { id: "4", open: false },
    { id: "5", open: false },
    { id: "6", open: false },
  ]);
  //au demarrage de la page on ouvre la premiere section
  useEffect(() => {
    if (user) {
      setpicture(user.userPhoto);
      setavatar(user.userPhoto);
      setpicturebg(user.background_image);
      setpolicetexte(user.policeStyle);
    }
  }, [user]);

  const handleabout = (id: string) => {
    sethide((prev) =>
      prev.map((p) => (p.id === id ? { ...p, open: !p.open } : p)),
    );
  };
  const refphoto = useRef<HTMLInputElement | null>(null);
  const reftexte = useRef<HTMLInputElement | null>(null);
  const refpassword = useRef<HTMLInputElement | null>(null);
  const refbg = useRef<HTMLInputElement | null>(null);
  interface Checkpass {
    id: string;
    texte: string;
  }
  const checklist: Checkpass[] = [
    { id: "1", texte: "Au moins 8 caractères." },
    { id: "2", texte: "Au moins 1 chiffre." },
    { id: "3", texte: "Au moins 1 majuscule." },
    { id: "4", texte: "Au moins 1 minuscule." },
    { id: "5", texte: "Au moins 1 symbole." },
  ];
  const checkpassword = (password: Checkpass): boolean => {
    const pass = formdata.userPasswordAgain;
    if (password.id === "1") {
      return pass.length >= 8;
    }
    if (password.id === "2") {
      return /\d/.test(pass);
    }
    if (password.id === "3") {
      return /[A-Z]/.test(pass);
    }
    if (password.id === "4") {
      return /[a-z]/.test(pass);
    }
    if (password.id === "5") {
      return /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    }
    return false;
  };
  interface Formdata {
    userName: string;
    userEmail: string;
    userPassword: string;
    userPhoto: File | null;
    userPasswordAgain: string;
    background_image: File | null;
    police: string;
  }
  const handleback = () => {
    setchoicePara1(false);
    setchoice1(true);
    setchoicePara2(false);
    setchoicePara3(false);
    setchoicePara4(false);
    setchoicePara5(false);
    setchoicePara6(false);
    setchoice2(true);
    setchoice3(true);
    setchoice4(true);
    setchoice5(true);
    setchoice6(true);
    setstartquiz(true);
    setavatar(user?.userPhoto || "");
  };
  const [formdata, setformdata] = useState<Formdata>({
    userName: user?.userName || "",
    userEmail: "",
    userPassword: "",
    userPhoto: null,
    userPasswordAgain: "",
    background_image: null,
    police: policetexte,
  });
  const handleclickpass = () => {
    const news = !showeye;
    setshoweye(news);
    setpasstype(news ? "text" : "password");
  };
  const handleclickpass1 = () => {
    const news = !showeye1;
    setshoweye1(news);
    setpasstype1(news ? "text" : "password");
  };
  const handleChangeMedia = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const fichier = e.target.files;
    if (name === "userPhoto" && fichier) {
      const file = fichier[0];
      if (file) {
        setformdata({ ...formdata, userPhoto: file });
        setSelectedDefaultAvatar(null);
        setavatar(URL.createObjectURL(file));
      }
    } else {
      setformdata({ ...formdata, [name]: value });
    }
  };
  const handlemodifyname = () => {
    setdisabling(true);
    setTimeout(() => {
      reftexte.current?.focus();
    }, 0);
  };
  const handlenewpicture = () => {
    refphoto.current?.click();
  };
  const handledeletepicture = () => {
    setavatar(no);
    setformdata({ ...formdata, userPhoto: null });
    setSelectedDefaultAvatar(null);
    setRemoveAvatar(true);
  };

  const handlesubmit1 = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const formData = new FormData();

      // Nom
      if (formdata.userName && formdata.userName !== user?.userName) {
        formData.append("userName", formdata.userName.trim());
      }
      if (removeAvatar) {
        formData.append("removeAvatar", "true");
      }

      // Avatar uploadé
      if (formdata.userPhoto) {
        formData.append("avatar", formdata.userPhoto);
      }

      // Avatar par défaut
      if (selectedDefaultAvatar) {
        formData.append("defaultAvatar", selectedDefaultAvatar);
      }
      if (formdata.userPasswordAgain) {
        const data = formdata.userPasswordAgain;
        const check = {
          longueur: data.length >= 8,
          chiffre: /\d/.test(data),
          majuscule: /[A-Z]/.test(data),
          minuscule: /[a-z]/.test(data),
          symbole: /[!@#$%^&*(),.?":{}|<>]/.test(data),
        };
        if (!Object.values(check).every((p) => p)) {
          alert("Le mot de passe ne respecte pas les critères.");
          setdisabling1(true);
          return;
        }
        setdisabling1(false);
      }
      // Mot de passe
      if (formdata.userPassword && formdata.userPasswordAgain) {
        formData.append("currentPassword", formdata.userPassword);
        formData.append("newPassword", formdata.userPasswordAgain);
      }

      const response = await connect.put(`/api/users/${user?.id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setUser(response.data.user);
      setavatar(response.data.user.userPhoto);
      toast.success("Profil mis à jour");
      setRemoveAvatar(false);
      handleback();
      setformdata({ ...formdata, userPassword: "", userPasswordAgain: "" });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur de mise à jour");
    }
  };

  const handlemodifypassword = () => {
    setdisabling1(true);
    setTimeout(() => {
      refpassword.current?.focus();
    }, 0);
  };
  const handlesavepassword = () => {
    const data = formdata.userPasswordAgain;
    const check = {
      longueur: data.length >= 8,
      chiffre: /\d/.test(data),
      majuscule: /[A-Z]/.test(data),
      minuscule: /[a-z]/.test(data),
      symbole: /[!@#$%^&*(),.?":{}|<>]/.test(data),
    };
    if (!Object.values(check).every((p) => p)) {
      alert("Le mot de passe ne respecte pas les critères.");
      setdisabling1(true);
      return;
    }
    setdisabling1(false);
  };
  const handlesavepicture = () => {
    if (!formdata.userName || formdata.userName.trim() === "") {
      setdisabling(true);
      return;
    }
    setdisabling(false);
  };
  const handlechoice1 = () => {
    setstartquiz(false);
    setchoicePara1(true);
    setchoice1(true);
    setchoicePara2(false);
    setchoicePara3(false);
    setchoicePara4(false);
    setchoicePara5(false);
    setchoicePara6(false);
    setchoice2(false);
    setchoice3(false);
    setchoice4(false);
    setchoice5(false);
    setchoice6(false);
  };
  const handledefineavatar = (p: string) => {
    setavatar(p);
    setSelectedDefaultAvatar(p);
    setformdata({ ...formdata, userPhoto: null }); // on annule l'upload
  };
  /* step 2**************** */
  const handlechoice2 = () => {
    setstartquiz(false);
    setchoicePara2(true);
    setchoice2(true);
    setchoicePara1(false);
    setchoicePara3(false);
    setchoicePara4(false);
    setchoicePara5(false);
    setchoicePara6(false);
    setchoice1(false);
    setchoice3(false);
    setchoice4(false);
    setchoice5(false);
    setchoice6(false);
  };
  const handlesubmit2 = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formdata.background_image && !selectedDefaultBg && !removeBgPending) {
      toast.error("Veuillez choisir une image");
      return;
    }
    try {
      const data = new FormData();
      if (removeBgPending) {
        data.append("removeBackground", "true");
      }
      if (formdata.background_image) {
        data.append("background", formdata.background_image);
      }
      if (selectedDefaultBg) {
        data.append("defaultBackground", selectedDefaultBg);
      }

      const res = await connect.put(`/api/users/${user?.id}/background`, data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setUser(res.data.user);

      setpicturebg(res.data.background_image);

      toast.success("Fond decran mis à jour");
      handleback();
    } catch (error) {
      toast.error("Erreur de mise à jour");
    }
  };
  const handleChangeMediabg = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const fichier = e.target.files;
    if (name === "background_image" && fichier) {
      const file = fichier[0];
      if (file) {
        setformdata({ ...formdata, background_image: file });
        setpicturebg(URL.createObjectURL(file));
      }
    } else {
      setformdata({ ...formdata, [name]: value });
    }
  };
  const handlenewpicturebg = () => {
    refbg.current?.click();
  };
  const handledeletepicturebg = () => {
    setpicturebg(null); // visuel
    setformdata({ ...formdata, background_image: null });
    setSelectedDefaultBg(null);
    setRemoveBgPending(true);
  };

  const handledefinebg = (p: string) => {
    setpicturebg(p);
    setSelectedDefaultBg(p);
    setformdata({ ...formdata, background_image: null });
  };

  /* step 3**************** */
  const handlechoice3 = () => {
    setstartquiz(false);
    setchoicePara3(true);
    setchoice3(true);
    setchoicePara1(false);
    setchoicePara2(false);
    setchoicePara4(false);
    setchoicePara5(false);
    setchoicePara6(false);
    setchoice1(false);
    setchoice2(false);
    setchoice4(false);
    setchoice5(false);
    setchoice6(false);
  };
  const handledeconnect = () => {
    logout();
  };
  /* step 4**************** */
  const handlechoice4 = () => {
    setstartquiz(false);
    setchoicePara4(true);
    setchoice4(true);
    setchoicePara1(false);
    setchoicePara2(false);
    setchoicePara3(false);
    setchoicePara5(false);
    setchoicePara6(false);
    setchoice1(false);
    setchoice2(false);
    setchoice3(false);
    setchoice5(false);
    setchoice6(false);
  };
  const handleClose = () => {
    setOpen(false);
  };
  const handleDropCount = async () => {
    try {
      await connect.delete(`/api/users/${user?.id}`);
      await logout();
    } catch (error) {
      console.error(error);
    }
  };

  /* step 5**************** */
  const handlechoice5 = () => {
    setstartquiz(false);
    setchoicePara5(true);
    setchoice5(true);
    setchoicePara1(false);
    setchoicePara2(false);
    setchoicePara3(false);
    setchoicePara4(false);
    setchoicePara6(false);
    setchoice1(false);
    setchoice2(false);
    setchoice3(false);
    setchoice4(false);
    setchoice6(false);
  };
  const handledefinepolice = (p: string) => {
    setpolicetexte(p);
  };
  const handlesubmit3 = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!policetexte) {
      return;
    }
    try {
      await connect.put(`/api/users/${user?.id}/police`, {
        policeStyle: policetexte,
      });

      toast.success("Police mise à jour");
      handleback();
    } catch (error) {
      console.error(error);
    }
  };
  /* step 6**************** */
  const handlechoice6 = () => {
    setstartquiz(false);
    setchoicePara6(true);
    setchoice6(true);
    setchoicePara1(false);
    setchoicePara2(false);
    setchoicePara3(false);
    setchoicePara4(false);
    setchoicePara5(false);
    setchoice1(false);
    setchoice2(false);
    setchoice3(false);
    setchoice4(false);
    setchoice5(false);
  };
  return (
    <div className="QuizHeader">
      <div className="QuizHeaderBtn">
        {!startquiz && (
          <Button className="retour" onClick={handleback}>
            Retour
          </Button>
        )}
        {startquiz && (
          <div className="QuizWord">
            {<img src={picture ? picture : no} alt="" />}
            <h1>{message}</h1>
          </div>
        )}
      </div>
      <div className="QuizHeaderTitle">
        <div className="ParaConfig">
          {choice1 && <p onClick={handlechoice1}>Changer votre profil</p>}
          {choice2 && (
            <p onClick={handlechoice2}>Changer fond d'ecran des messages</p>
          )}
          {choice3 && (
            <p onClick={handlechoice3}>Voulez-vous vous déconnecter ?</p>
          )}
          {choice4 && (
            <p onClick={handlechoice4}>voulez-vous supprimer votre compte</p>
          )}
          {choice5 && <p onClick={handlechoice5}>Changer la police de texte</p>}
          {choice6 && (
            <p onClick={handlechoice6}>En savoir plus sur QuizGen-IA</p>
          )}
        </div>
        {choicePara1 && (
          <form onSubmit={handlesubmit1}>
            <div className="ParaConfigProfil">
              <div className="headerChangeProfil">
                <p>Changer votre photo de profil</p>
                <div className="changeProfilPicture">
                  <span>
                    cliquer sur votre photo principale ou mini avatar pour
                    ajouter une photo.
                  </span>
                  <div className="visualPicture" onClick={handlenewpicture}>
                    <img className="plus" src={plus} alt="" />
                    {avatar && (
                      <img
                        className="realpicture"
                        src={avatar}
                        alt="photo de profil"
                      />
                    )}
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  ref={refphoto}
                  name="userPhoto"
                  onChange={handleChangeMedia}
                  style={{ display: "none" }}
                />
                <div className="selectParaAvatar">
                  {Avatar.map((p) => (
                    <div className="" key={p.id}>
                      <img
                        src={p.avatar}
                        alt=""
                        onClick={() => handledefineavatar(p.avatar)}
                      />
                    </div>
                  ))}
                </div>
                {picture && picture.length > 0 && (
                  <div className="pictureParabtn">
                    <Button className="retour" onClick={handlenewpicture}>
                      changer la photo
                    </Button>
                    <Button className="decline" onClick={handledeletepicture}>
                      supprimer la photo
                    </Button>
                  </div>
                )}
              </div>
              <div className="headerChangeProfil">
                <p>modifier votre nom</p>
                <input
                  type="text"
                  placeholder="Entrer votre nom"
                  value={formdata.userName}
                  name="userName"
                  id="textpicture"
                  ref={reftexte}
                  onChange={handleChangeMedia}
                  disabled={!disabling}
                  style={{ backgroundColor: disabling ? "white" : "green" }}
                />
                {formdata.userName.length > 0 && (
                  <div className="pictureParabtn">
                    <Button className="retour" onClick={handlemodifyname}>
                      modifier le nom
                    </Button>
                    <Button className="accept" onClick={handlesavepicture}>
                      valider
                    </Button>
                  </div>
                )}
              </div>
              <div className="headerChangeProfil">
                <p>modifier votre mot de passe</p>
                <div className="ProfilPassword">
                  <input
                    type={passtype}
                    value={formdata.userPassword}
                    name="userPassword"
                    id="textpicture"
                    onChange={handleChangeMedia}
                    placeholder="saisir votre mot de passe actuel"
                  />
                  <div className="paraEyePass" onClick={handleclickpass}>
                    {showeye ? (
                      <img src={eye} alt="" />
                    ) : (
                      <img src={eyeClose} alt="" />
                    )}
                  </div>
                </div>
                <div className="ProfilPassword">
                  <input
                    placeholder="saisir le nouveau mot de passe"
                    type={passtype1}
                    ref={refpassword}
                    value={formdata.userPasswordAgain}
                    name="userPasswordAgain"
                    id="textpicture"
                    onChange={handleChangeMedia}
                    disabled={!disabling1}
                    style={{ backgroundColor: disabling1 ? "white" : "green" }}
                  />
                  <div className="paraEyePass" onClick={handleclickpass1}>
                    {showeye1 ? (
                      <img src={eye} alt="" />
                    ) : (
                      <img src={eyeClose} alt="" />
                    )}
                  </div>
                </div>
                {formdata.userPasswordAgain.length > 0 && (
                  <div className="OptionsCheck">
                    <div className="OptionsPass">
                      {checklist.map((p) => (
                        <div
                          key={p.id}
                          className="OptionsCase"
                          style={{ color: checkpassword(p) ? "green" : "red" }}
                        >
                          <>{checkpassword(p) ? "✅" : "❌"}</>
                          <span>{p.texte}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pictureParabtn">
                      <Button className="retour" onClick={handlemodifypassword}>
                        modifier le password
                      </Button>
                      <Button className="accept" onClick={handlesavepassword}>
                        valider
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="paraValid">
                <Button type="submit" className="accept">
                  Sauvergarder
                </Button>
              </div>
            </div>
          </form>
        )}
        {choicePara2 && (
          <form onSubmit={handlesubmit2}>
            <div className="ParaConfigProfil">
              <div className="headerChangeProfil">
                <p>Changer votre fond d'ecran des messages</p>
                <div className="changeProfilPicture">
                  <span>cliquer pour ajouter une image de fond</span>
                  <div className="visualPicture" onClick={handlenewpicturebg}>
                    <img className="plus" src={plus} alt="" />
                    {picturebg && (
                      <img
                        className="realpicture"
                        src={picturebg}
                        alt="photo de profil"
                      />
                    )}
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  ref={refbg}
                  name="background_image"
                  onChange={handleChangeMediabg}
                  style={{ display: "none" }}
                />
                {picturebg && picturebg.length > 0 && (
                  <div className="pictureParabtn">
                    <Button className="retour" onClick={handlenewpicturebg}>
                      changer le fond d'ecran
                    </Button>
                    <Button className="decline" onClick={handledeletepicturebg}>
                      supprimer le fond d'ecran
                    </Button>
                  </div>
                )}
                <div className="selectParabg">
                  {Background.map((p) => (
                    <div className="" key={p.id}>
                      <img
                        src={p.background}
                        alt=""
                        onClick={() => handledefinebg(p.background)}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="paraValid">
                <Button type="submit" className="accept">
                  Sauvergarder
                </Button>
              </div>
            </div>
          </form>
        )}
        {choicePara3 && (
          <div className="ParaConfigProfil">
            <div className="headerChangeProfil">
              <p>Dimitri,Voulez-vous vous déconnecter ?</p>
              <div className="changeProfilPicture"></div>
            </div>
            <div className="pictureParabtn">
              <Button className="retour" onClick={handleback}>
                non
              </Button>
              <Button className="accept" onClick={handledeconnect}>
                oui
              </Button>
            </div>
          </div>
        )}
        {choicePara4 && (
          <div className="ParaConfigProfil">
            <div className="headerChangeProfil">
              <p>{user?.userName},Voulez-vous vous supprimer votre compte ?</p>
              <div className="changeProfilPicture"></div>
            </div>
            <div className="pictureParabtn">
              <Button className="retour" onClick={handleback}>
                non
              </Button>
              <Button className="accept" onClick={() => setOpen(true)}>
                oui
              </Button>
            </div>
          </div>
        )}
        {choicePara5 && (
          <form onSubmit={handlesubmit3}>
            <div className="ParaConfigProfil">
              <div className="headerChangeProfil">
                <p>Changer votre polices des textes</p>
                <div className="changeProfilPicture">
                  <span>visualier un texte</span>
                  <div className="visualPictures">
                    <span style={{ fontFamily: policetexte }}>
                      hello bienvenue sur l'application quizGen-IA,ceci est un
                      test de visualisation de police.
                    </span>
                  </div>
                </div>
                <div className="selectParapolice">
                  {Police.map((p) => (
                    <div className="" key={p.id}>
                      <span
                        onClick={() => {
                          handledefinepolice(p.police);
                          setpolicetexte(p.police);
                        }}
                        className={`policeselect ${policetexte === p.police ? "active" : ""}`}
                      >
                        {p.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="paraValid">
                <Button type="submit" className="accept">
                  Sauvergarder
                </Button>
              </div>
            </div>
          </form>
        )}
        {choicePara6 && (
          <div className="ParaConfigProfil">
            <div className="headerChangeProfil">
              <p onClick={() => handleabout("1")}>
                Qu’est-ce que QuizGen-IA ?
                <span>
                  <img src={hide[0].open ? up : down} alt="" />
                </span>
              </p>

              <div
                className={`changeProfilPicture ${hide[0].open ? "open" : "close"}`}
              >
                <ul>
                  <li>
                    QuizGen-IA est une application intelligente qui permet de
                    générer automatiquement des quiz à partir de documents grâce
                    à l’intelligence artificielle.
                  </li>
                  <li>
                    En quelques secondes, l’utilisateur peut transformer un
                    document (PDF, texte, cours, notes…) en un quiz interactif,
                    structuré et adapté à ses besoins d’apprentissage.
                  </li>
                  <li>
                    L’objectif principal de QuizGen-IA est de faciliter la
                    mémorisation, l’auto-évaluation et l’apprentissage actif.
                  </li>
                </ul>
              </div>
            </div>
            <div className="headerChangeProfil">
              <p onClick={() => handleabout("2")}>
                Comment fonctionne QuizGen-IA ?{" "}
                <span>
                  <img src={hide[1].open ? up : down} alt="" />
                </span>
              </p>

              <div
                className={`changeProfilPicture ${hide[1].open ? "open" : "close"}`}
              >
                <ul>
                  <li>
                    Ajout d’un document L’utilisateur importe un document
                    (cours, résumé, support pédagogique, etc.).
                  </li>
                  <li>
                    Analyse intelligente du contenu L’intelligence artificielle
                    analyse le texte, identifie les concepts clés, les
                    définitions importantes et les informations essentielles.
                  </li>
                  <li>
                    Génération automatique du quiz À partir du document,
                    QuizGen-IA crée : des questions pertinentes des réponses
                    cohérentes différents niveaux de difficulté
                  </li>
                  <li>
                    Interaction et évaluation L’utilisateur répond aux
                    questions, obtient un score et peut suivre sa progression.
                  </li>
                </ul>
              </div>
            </div>
            <div className="headerChangeProfil">
              <p onClick={() => handleabout("3")}>
                Le rôle de l’intelligence artificielle{" "}
                <span>
                  <img src={hide[2].open ? up : down} alt="" />
                </span>
              </p>
              <div
                className={`changeProfilPicture ${hide[2].open ? "open" : "close"}`}
              >
                <ul>
                  <li>L’IA est au cœur de QuizGen-IA. Elle permet de :</li>
                  <li>Comprendre le sens du texte, pas seulement les mots</li>
                  <li>Identifier les éléments importants d’un document</li>
                  <li>
                    Générer des questions logiques, variées et contextualisées
                  </li>
                </ul>
              </div>
            </div>
            <div className="headerChangeProfil">
              <p onClick={() => handleabout("4")}>
                QuizGen-IA est conçu pour{" "}
                <span>
                  <img src={hide[3].open ? up : down} alt="" />
                </span>
              </p>
              <div
                className={`changeProfilPicture ${hide[3].open ? "open" : "close"}`}
              >
                <ul>
                  <li>Étudiants : réviser plus efficacement leurs cours</li>
                  <li>
                    Enseignants / formateurs : créer rapidement des quiz
                    pédagogiques
                  </li>
                  <li>Autodidactes : tester leur compréhension d’un sujet</li>
                  <li>
                    Professionnels : évaluer des connaissances après une
                    formation
                  </li>
                </ul>
              </div>
            </div>
            <div className="headerChangeProfil">
              <p onClick={() => handleabout("5")}>
                Sécurité et confidentialité des données{" "}
                <span>
                  <img src={hide[4].open ? up : down} alt="" />
                </span>
              </p>
              <div
                className={`changeProfilPicture ${hide[4].open ? "open" : "close"}`}
              >
                <ul>
                  <li>
                    QuizGen-IA accorde une grande importance à la protection des
                    données :
                  </li>
                  <li>
                    Les documents importés sont utilisés uniquement pour la
                    génération des quiz
                  </li>
                  <li>Aucune exploitation abusive du contenu</li>
                  <li>
                    Sécurisation des échanges et des informations personnelles
                  </li>
                  <li>Respect de la confidentialité de l’utilisateur</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
      {open && (
        <Dialog open={open} onClose={handleClose} className="customdialog">
          <DialogContent>
            <DialogContentText
              style={{ textAlign: "center", marginBottom: "20px" }}
            >
              <p>voulez vous vraiment supprimer votre compte 🥲</p>
            </DialogContentText>
            <img src={pleure} alt="" />
          </DialogContent>
          <DialogActions className="optiondialog">
            <Button onClick={handleClose} className="retour">
              Retour
            </Button>
            <Button className="accept" onClick={handleDropCount}>
              confirmer
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
};

export default Parametre;
