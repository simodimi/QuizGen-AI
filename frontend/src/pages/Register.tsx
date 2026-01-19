import React, { useState, type ChangeEvent } from "react";
import logo from "../assets/icone/quiz.png";
import Button from "../components/ui/Button";
import eye from "../assets/icone/ouvert.png";
import eyeClose from "../assets/icone/fermé.png";
import { Link, useNavigate } from "react-router-dom";
const Register = () => {
  interface FormData {
    userName: string;
    userEmail: string;
    userPassword: string;
    userPasswordAgain: string;
  }
  interface PasswordRule {
    id: string;
    texte: string;
  }
  const navigate = useNavigate();
  const [passtype, setpasstype] = useState<"password" | "text">("password");
  const [passtype1, setpasstype1] = useState<"password" | "text">("password");
  const [showeye, setshoweye] = useState<boolean>(false);
  const [showeye1, setshoweye1] = useState<boolean>(false);
  const [errorsms, seterrorsms] = useState<string>("");
  const [hideerrorsms, sethideerrorsms] = useState<boolean>(false);
  const [hidecheckpassword, sethidecheckpassword] = useState<boolean>(false);
  const verify: PasswordRule[] = [
    { id: "1", texte: "Au moins 8 caractères." },
    { id: "2", texte: "Au moins 1 chiffre." },
    { id: "3", texte: "Au moins 1 majuscule." },
    { id: "4", texte: "Au moins 1 minuscule." },
    { id: "5", texte: "Au moins 1 symbole." },
  ];

  const [formdata, setformdata] = useState<FormData>({
    userName: "",
    userEmail: "",
    userPassword: "",
    userPasswordAgain: "",
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setformdata({ ...formdata, [name]: value });
    if (name === "userPassword") {
      sethidecheckpassword(value.trim().length > 0);
    }
  };
  const handlePass = (): void => {
    const newItems = !showeye;
    setshoweye(newItems);
    setpasstype(newItems ? "text" : "password");
  };
  const handlePass1 = (): void => {
    const newItems = !showeye1;
    setshoweye1(newItems);
    setpasstype1(newItems ? "text" : "password");
  };
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formdata.userPassword !== formdata.userPasswordAgain) {
      seterrorsms("Les mots de passe ne correspondent pas.");
      sethideerrorsms(true);
      return;
    }
    if (
      !formdata.userEmail ||
      !formdata.userName ||
      !formdata.userPassword ||
      !formdata.userPasswordAgain
    ) {
      seterrorsms("Veuillez remplir tous les champs.");
      sethideerrorsms(true);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formdata.userEmail)) {
      seterrorsms("Veuillez entrer une adresse e-mail valide.");
      sethideerrorsms(true);
      return;
    }
    const pass = formdata.userPassword;
    const check = {
      longueur: pass.length >= 8,
      chiffre: /\d/.test(pass),
      majuscule: /[A-Z]/.test(pass),
      minuscule: /[a-z]/.test(pass),
      symbole: /[!@#$%^&*(),.?":{}|<>]/.test(pass),
    };
    if (!Object.values(check).every((p) => p)) {
      seterrorsms("Le mot de passe ne respecte pas les critères.");
      sethideerrorsms(true);
    }
    navigate("/home");
    console.log({
      userName: formdata.userName,
      userEmail: formdata.userEmail,
      userPassword: formdata.userPassword,
      userPasswordAgain: formdata.userPasswordAgain,
    });
    setformdata({
      userName: "",
      userEmail: "",
      userPassword: "",
      userPasswordAgain: "",
    });
    sethideerrorsms(false);
    sethidecheckpassword(false);
  };
  const checkpassword = (password: PasswordRule): boolean => {
    const pass = formdata.userPassword;
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
  return (
    <div className="headerLogin">
      <div className="MainLogin">
        <div className="TitleLogin">
          <img src={logo} alt="Logo" />
        </div>
        {hideerrorsms && <p id="smserror">{errorsms}</p>}
        <form onSubmit={handleSubmit}>
          <div className="LoginAnswer">
            <p>Nom utilisateur</p>
            <input
              type="text"
              value={formdata.userName}
              onChange={handleChange}
              name="userName"
              id=""
              placeholder="saisir votre nom d'utilisateur"
            />
          </div>
          <div className="LoginAnswer">
            <p>Mail utilisateur</p>
            <input
              type="email"
              value={formdata.userEmail}
              onChange={handleChange}
              name="userEmail"
              id=""
              placeholder="saisir votre mail"
            />
          </div>
          <div className="LoginAnswer">
            <p>Mot de passe</p>
            <div className="LoginShowPassword">
              <input
                type={passtype}
                value={formdata.userPassword}
                name="userPassword"
                onChange={handleChange}
                id=""
                placeholder="saisir votre mot de passe"
              />
              <span onClick={handlePass}>
                {showeye ? <img src={eye} /> : <img src={eyeClose} />}
              </span>
            </div>
          </div>
          <div className="LoginAnswer">
            <p>Confirmer mot de passe</p>
            <div className="LoginShowPassword">
              <input
                type={passtype1}
                value={formdata.userPasswordAgain}
                name="userPasswordAgain"
                onChange={handleChange}
                id=""
                placeholder="saisir à nouveau votre mot de passe"
              />
              <span onClick={handlePass1}>
                {showeye1 ? <img src={eye} /> : <img src={eyeClose} />}
              </span>
            </div>
          </div>
          {hidecheckpassword && (
            <div className="">
              {verify.map((p) => (
                <div
                  className="flex items-center gap-2"
                  key={p.id}
                  style={{ color: checkpassword(p) ? "green" : "red" }}
                >
                  <span>{checkpassword(p) ? "✅" : "❌"}</span>
                  <p>{p.texte}</p>
                </div>
              ))}
            </div>
          )}
          <div className="LoginConnect">
            <Button type="submit" className="retour">
              S'inscrire
            </Button>
          </div>
        </form>
        <div className="LoginLink">
          <p>
            vous avez deja un compte ? <Link to="/connexion">se connecter</Link>
          </p>
          <p>
            vous avez oubliez votre mot de passe ?{" "}
            <Link to="/mot-de-passe-oublie">reinitialiser</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
