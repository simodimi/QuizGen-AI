import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import connect from "./Util";
import { useNavigate } from "react-router-dom";

// Interface pour l'utilisateur
interface User {
  id: string | number;
  userName: string;
  userEmail: string;
  userPhoto: string;
  statut: string;
  background_image: string;
  policeStyle: string;
}

// Interface pour le contexte d'authentification
interface AuthContextType {
  user: User | null; //user:soit l'user connecté soit null
  loading: boolean;
  //Promise opération asynchrones qui peut prendre du temps et retourne une valeur User
  login: (userEmail: string, userPassword: string) => Promise<User>;
  logout: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  isAuthenticated: boolean;
}

// Props pour le Provider
interface AuthProviderProps {
  children: React.ReactNode;
}
//authContextUser permet d'utiliser le contexte d'authentification sur toutes les pages
const AuthContextUser = createContext<AuthContextType | undefined>(undefined);
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContextUser);
  if (!context) {
    throw new Error("useAuth must be used within a AuthProvider");
  }
  return context;
};

export const AuthProviderUser = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  //charger les infos de l'utilisateur
  const fetchMe = async () => {
    try {
      const res = await connect.get("/api/users/me");
      if (res.data && res.data.id) {
        setUser(res.data);
      }
    } catch (error) {
      setUser(null);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  //se logger
  const login = async (
    userEmail: string,
    userPassword: string,
  ): Promise<User> => {
    try {
      const res = await connect.post("/api/auth/login", {
        userEmail,
        userPassword,
      });

      if (res.data && res.data.id) {
        setUser(res.data);
        toast.success(`Connexion réussie ${res.data.userName}`);
        return res.data;
      } else {
        throw new Error("Données utilisateur manquantes");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
      throw error;
    }
  };

  //deconnexion
  const logout = async (): Promise<void> => {
    try {
      await connect.get("/api/auth/logout");
      setUser(null);
      navigate("/");
    } catch (error) {
      console.error(error);
      setUser(null);
    }
  };
  //valeur du contexte
  const contextValue: AuthContextType = {
    user,
    loading,
    login,
    logout,
    setUser,
    //if user existe alors isAuthenticated est vrai sinon faux
    isAuthenticated: !!user,
  };
  return (
    <AuthContextUser.Provider value={contextValue}>
      {!loading && children}{" "}
    </AuthContextUser.Provider>
  );
};
