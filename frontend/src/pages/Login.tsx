import React, { useState, type ChangeEvent } from "react";
import logo from "../assets/icone/quiz.png";
import Button from "../components/ui/Button";
import eye from "../assets/icone/ouvert.png";
import eyeClose from "../assets/icone/fermé.png";
import "../style/connexion.css";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../services/AuthContextUser";

interface axiosError {
  response?: { data?: { message?: string } };
}
const Login = () => {
  interface FormData {
    userEmail: string;
    userPassword: string;
  }
  const [formdata, setformdata] = useState<FormData>({
    userEmail: "",
    userPassword: "",
  });
  const navigate = useNavigate();
  const [passtype, setpasstype] = useState<"password" | "text">("password");
  const [showeye, setshoweye] = useState<boolean>(false);
  const [errorsms, seterrorsms] = useState<string>("");
  const { login, user } = useAuth();
  const [hideerrorsms, sethideerrorsms] = useState<boolean>(false);
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setformdata({ ...formdata, [name]: value });
  };
  const handlePass = (): void => {
    const neweye = !showeye;
    setshoweye(neweye);
    setpasstype(neweye ? "text" : "password");
  };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formdata.userEmail || !formdata.userPassword) {
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
    try {
      await login(formdata.userEmail, formdata.userPassword);
      navigate("/home");
      toast.success(`Hello ${user?.userName}`);
      setformdata({ ...formdata, userEmail: "", userPassword: "" });
      sethideerrorsms(false);
    } catch (error) {
      const err = error as axiosError;
      if (err.response) {
        seterrorsms(err.response?.data?.message || "erreur de connexion");
      } else {
        seterrorsms("Une erreur s'est produite.");
      }
    }
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
          <div className="LoginConnect">
            <Button type="submit" className="retour">
              Se connecter
            </Button>
          </div>
        </form>
        <div className="LoginLink">
          <p>
            vous n'avez pas de compte ?{" "}
            <Link to="/inscription">s'inscrire</Link>
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

export default Login;
