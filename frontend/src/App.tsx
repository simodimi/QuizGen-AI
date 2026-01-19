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

function App() {
  const Layout = () => {
    return (
      <div className="AppHeader">
        <div className="AppHeaderLeft">
          <Sidebar />
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
        <Routes>
          <Route path="/" element={<Navigate to="/connexion" replace />} />
          <Route path="/connexion" element={<Login />} />
          <Route path="/inscription" element={<Register />} />
          <Route path="/mot-de-passe-oublie" element={<ForgetPassword />} />
          <Route path="/home" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="quiz/:theme" element={<Quiz />} />
            <Route path="quiz/autoIA" element={<QuizAuto />} />
            <Route path="ami" element={<Ami />} />
            <Route path="document" element={<Document />} />
            <Route path="result" element={<Result />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="parametre" element={<Parametre />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
