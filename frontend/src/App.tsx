import "./App.css";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import "../src/index.css";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgetPassword from "./pages/ForgetPassword";
import Sidebar from "./components/layout/Sidebar";
import Home from "./pages/Home";
import Ami from "./pages/Ami";
import Document from "./pages/Document";
import Result from "./pages/Result";
import Dashboard from "./pages/Dashboard";
import Parametre from "./pages/Parametre";
import Quiz from "./pages/Quiz";
import QuizAuto from "./pages/QuizAuto";
import Message from "./pages/Message";
import { useState } from "react";
import Notification from "./components/layout/Notification";
import Waiting from "./components/layout/Waiting";
import ConfirmAccount from "./services/ConfirmAccount";
import { AuthProviderUser } from "./services/AuthContextUser";
import ProctectRouteUser from "./services/ProctectRouteUser";

function App() {
  const [countFriends, setcountFriends] = useState<number>(0);
  const [passdocument, setpassdocument] = useState<
    { file: File; createdAt: number }[]
  >([]);
  const [usersend, setusersend] = useState<number | null>(null);
  const Layout = () => {
    return (
      <div className="AppHeader">
        <div className="AppHeaderLeft">
          <Sidebar countFriends={countFriends} />
        </div>
        <div className="AppHeaderRight">
          <Outlet />
        </div>
      </div>
    );
  };
  return (
    <>
      <BrowserRouter>
        <AuthProviderUser>
          <Routes>
            <Route path="/" element={<Navigate to="/connexion" replace />} />
            <Route path="/connexion" element={<Login />} />
            <Route path="/inscription" element={<Register />} />
            <Route path="/confirmation/:token" element={<ConfirmAccount />} />
            <Route path="/wait" element={<Waiting />} />
            <Route path="/mot-de-passe-oublie" element={<ForgetPassword />} />

            {/* Route protégée - SEULEMENT celle-ci est protégée */}
            <Route
              path="/home"
              element={
                <ProctectRouteUser>
                  <Layout />
                </ProctectRouteUser>
              }
            >
              <Route index element={<Home />} />
              <Route path="quiz/:theme" element={<Quiz />} />
              <Route
                path="quiz/autoIA"
                element={<QuizAuto setpassdocument={setpassdocument} />}
              />
              <Route
                path="ami"
                element={
                  <Ami
                    setcountFriends={setcountFriends}
                    setusersend={setusersend}
                  />
                }
              />
              <Route
                path="document"
                element={<Document passdocument={passdocument} />}
              />
              <Route path="result" element={<Result />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="parametre" element={<Parametre />} />
              <Route path="message" element={<Message usersend={usersend} />} />
            </Route>
          </Routes>
          <Notification />
        </AuthProviderUser>
      </BrowserRouter>
    </>
  );
}

export default App;
