import { useState, type ChangeEvent, type FormEvent } from "react";
import logo from "../assets/icone/quiz.png";
import Button from "../components/ui/Button";
import eye from "../assets/icone/ouvert.png";
import eyeClose from "../assets/icone/fermé.png";
import Box from "@mui/material/Box";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepButton from "@mui/material/StepButton";
import { Link, useNavigate } from "react-router-dom";
import "../style/connexion.css";

const ForgetPassword = () => {
  interface FormData {
    userEmail: string;
    userPassword: string;
    userCode: string;
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
  const [formdata, setformdata] = useState<FormData>({
    userEmail: "",
    userPassword: "",
    userCode: "",
    userPasswordAgain: "",
  });
  const verify: PasswordRule[] = [
    { id: "1", texte: "Au moins 8 caractères." },
    { id: "2", texte: "Au moins 1 chiffre." },
    { id: "3", texte: "Au moins 1 majuscule." },
    { id: "4", texte: "Au moins 1 minuscule." },
    { id: "5", texte: "Au moins 1 symbole." },
  ];

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setformdata({ ...formdata, [name]: value });
    if (name === "userPassword") {
      sethidecheckpassword(value.trim().length > 0);
    }
  };
  const handlePass = (): void => {
    const items = !showeye;
    setshoweye(items);
    setpasstype(items ? "text" : "password");
  };
  const handlePass1 = (): void => {
    const items = !showeye;
    setshoweye1(items);
    setpasstype1(items ? "text" : "password");
  };
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };
  const handleValider = (): void => {
    if (activeStep === 2) {
      if (formdata.userPassword !== formdata.userPasswordAgain) {
        seterrorsms("Les mots de passe ne correspondent pas.");
        sethideerrorsms(true);
        return;
      }
      if (!formdata.userPassword || !formdata.userPasswordAgain) {
        seterrorsms("Veuillez remplir tous les champs.");
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
        return;
      }
      seterrorsms("");
      sethideerrorsms(false);
      sethidecheckpassword(false);
      navigate("/connexion");
      console.log({
        userEmail: formdata.userEmail,
        userPassword: formdata.userPassword,
        userPasswordAgain: formdata.userPasswordAgain,
        userCode: formdata.userCode,
      });
    }
  };
  const steps = ["Adresse mail", "Code de réinitialisation", "Mot de passe"];
  const [activeStep, setActiveStep] = useState<number>(0);
  const completed: {
    [k: number]: boolean;
  } = {};

  const handleNext = (): void => {
    if (activeStep === 0) {
      if (!formdata.userEmail) {
        seterrorsms("Veuillez remplir tous les champs.");
        sethideerrorsms(true);
        return;
      }
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!regex.test(formdata.userEmail)) {
        seterrorsms("Veuillez entrer une adresse e-mail valide.");
        sethideerrorsms(true);
        return;
      }
      seterrorsms("");
      sethideerrorsms(false);
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
    if (activeStep === 1) {
      if (!formdata.userCode) {
        seterrorsms("Veuillez remplir tous les champs.");
        sethideerrorsms(true);
        return;
      }
      seterrorsms("");
      sethideerrorsms(false);
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };
  const handleBack = (): void => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleStep = (step: number) => () => {
    setActiveStep(step);
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
          <Box sx={{ width: "100%" }}>
            <Stepper nonLinear activeStep={activeStep}>
              {steps.map((label, index) => (
                <Step key={label} completed={completed[index]}>
                  <StepButton color="inherit" onClick={handleStep(index)}>
                    {label}
                  </StepButton>
                </Step>
              ))}
            </Stepper>
            <div className="MenuReset">
              {activeStep === 0 && (
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
              )}
              {activeStep === 1 && (
                <div className="LoginAnswer">
                  <p>Code de réinitialisation</p>
                  <input
                    type="text"
                    value={formdata.userCode}
                    onChange={handleChange}
                    name="userCode"
                    id=""
                    placeholder="saisir votre code"
                  />
                </div>
              )}
              {activeStep === 2 && (
                <div className="">
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
                        placeholder="confirmer votre mot de passe"
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
                          <p>{p.texte} </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Box className="btnSelect">
                <Button
                  className="retour"
                  disabled={activeStep === 0}
                  style={{ display: activeStep === 0 ? "none" : "block" }}
                  onClick={handleBack}
                >
                  Retour
                </Button>
                <Box />
                {activeStep === steps.length - 1 ? (
                  <Button
                    className="accept"
                    type="submit"
                    onClick={handleValider}
                  >
                    Valider
                  </Button>
                ) : (
                  <Button className="accept" onClick={handleNext}>
                    Suivant
                  </Button>
                )}
              </Box>
            </div>
          </Box>
        </form>
        <div className="LoginLink">
          <p>
            vous avez un compte? <Link to="/connexion">Se connecter</Link>
          </p>
          <p>
            vous n'avez pas de compte? <Link to="/inscription">S'inscrire</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgetPassword;
