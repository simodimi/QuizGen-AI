import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import connect from "./Util";
import { toast } from "react-toastify";
import img from "../assets/icone/logo.png";

interface AxiosError {
  response?: { data?: { message?: string } };
}
const ConfirmAccount = () => {
  const hasValided = useRef<boolean>(false);
  const { token } = useParams<string>();
  const navigate = useNavigate();
  useEffect(() => {
    if (!token || hasValided.current) return;
    hasValided.current = true;
    const validate = async () => {
      try {
        await connect.get(`/api/auth/validate/${token}`);
        toast.success("Compte activé avec succès !");
        setTimeout(() => navigate("/"), 2000);
      } catch (error: unknown) {
        const axiosError = error as AxiosError;
        const msg = axiosError.response?.data?.message;
        if (msg === "utilisateur deja actif") {
          toast.info("Compte déjà activé, vous pouvez vous connecter");
          navigate("/");
        } else {
          toast.error("Lien invalide ou expiré");
        }
      }
    };
    validate();
  }, [token, navigate]);

  return (
    <div className="headerwait">
      <h2>Validation en cours...</h2>
      <p>Veuillez patienter</p>
      <img src={img} alt="" />
    </div>
  );
};

export default ConfirmAccount;
