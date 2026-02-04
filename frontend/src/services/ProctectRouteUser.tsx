import React, { useEffect } from "react";
import { useAuth } from "./AuthContextUser";
import { toast } from "react-toastify";
import { Navigate, Outlet, useLocation } from "react-router-dom";

interface Props {
  children: React.ReactNode;
}
const ProctectRouteUser = ({ children }: Props) => {
  const { loading, isAuthenticated } = useAuth();
  const location = useLocation();
  useEffect(() => {
    //si le chargement est terminé et que l'user n'est pas authentifié
    if (!loading && !isAuthenticated) {
      toast.error("Veuillez vous connecter pour continuer", {
        toastId: "auth-error",
      });
    }
  }, [loading, isAuthenticated]);

  if (loading) {
    return (
      <div className="headerwait">
        <p>Vérification de la session...</p>
      </div>
    );
  }
  if (!isAuthenticated) {
    //replace:empêche le retour
    //state={{}} memorise la page demandée,et redirige après le login
    return <Navigate to="/" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
};

export default ProctectRouteUser;
