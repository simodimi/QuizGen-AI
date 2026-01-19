import img1 from "../../assets/icone/q.png";
import img2 from "../../assets/icone/ami.png";
import img3 from "../../assets/icone/doc.png";
import img4 from "../../assets/icone/result.png";
import img5 from "../../assets/icone/dash.png";
import img6 from "../../assets/icone/para.png";
import img7 from "../../assets/icone/quiz.png";
import "../../style/home.css";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
const Sidebar = () => {
  const [select, setselect] = useState<string>("quiz");
  const location = useLocation();
  useEffect(() => {
    if (location.pathname === "/home") setselect("quiz");
    if (location.pathname === "/home/ami") setselect("ami");
    if (location.pathname === "/home/document") setselect("doc");
    if (location.pathname === "/home/result") setselect("result");
    if (location.pathname === "/home/dashboard") setselect("dash");
    if (location.pathname === "/home/parametre") setselect("para");
  }, [location.pathname]);

  return (
    <div className="SidebarHeader">
      <div className="SiderbarHeaderNormal">
        <div className="SiderbarHeaderTop">
          <div
            className={`SiderbarTitle ${
              select === "quiz" ? "siderbaractive" : ""
            }`}
            onClick={() => setselect("quiz")}
          >
            <Link to="/home">
              <div className="SiderbarIcone">
                <img src={img1} alt="" />
                <p>Quiz</p>
              </div>
            </Link>
          </div>
          <div
            className={`SiderbarTitle ${
              select === "ami" ? "siderbaractive" : ""
            }`}
            onClick={() => setselect("ami")}
          >
            <Link to="/home/ami">
              <div className="SiderbarIcone">
                <img src={img2} alt="" />
                <p>Ami(e)s</p>
                <span>0</span>
              </div>
            </Link>
          </div>
          <div
            className={`SiderbarTitle ${
              select === "doc" ? "siderbaractive" : ""
            }`}
            onClick={() => setselect("doc")}
          >
            <Link to="/home/document">
              <div className="SiderbarIcone">
                <img src={img3} alt="" />
                <p>Documents</p>
              </div>
            </Link>
          </div>
          <div
            className={`SiderbarTitle ${
              select === "result" ? "siderbaractive" : ""
            }`}
            onClick={() => setselect("result")}
          >
            <Link to="/home/result">
              <div className="SiderbarIcone">
                <img src={img4} alt="" />
                <p>Résultats</p>
              </div>
            </Link>
          </div>
          <div
            className={`SiderbarTitle ${
              select === "dash" ? "siderbaractive" : ""
            }`}
            onClick={() => setselect("dash")}
          >
            <Link to="/home/dashboard">
              <div className="SiderbarIcone">
                <img src={img5} alt="" />
                <p>Dashboard</p>
              </div>
            </Link>
          </div>
        </div>
        <div className="SiderbarHeaderBottom">
          <div
            className={`SiderbarTitle ${
              select === "para" ? "siderbaractive" : ""
            }`}
            onClick={() => setselect("para")}
          >
            <Link to="/home/parametre">
              <div className="SiderbarIcone">
                <img src={img6} alt="" />
                <p>Paramètres</p>
              </div>
            </Link>
          </div>
          <div className="SiderbarTitles">
            <img src={img7} alt="" />
          </div>
        </div>
      </div>
      <div className="SiderbarHeaderRespo">
        <div className="SiderbarHeaderTop">
          <div
            className={`SiderbarTitle ${
              select === "quiz" ? "siderbaractive" : ""
            }`}
            onClick={() => setselect("quiz")}
          >
            <Link to="/home">
              <div className="SiderbarIcone">
                <img src={img1} alt="" />
                <p>Quiz</p>
              </div>
            </Link>
          </div>
          <div
            className={`SiderbarTitle ${
              select === "ami" ? "siderbaractive" : ""
            }`}
            onClick={() => setselect("ami")}
          >
            <Link to="/home/ami">
              <div className="SiderbarIcone">
                <img src={img2} alt="" />
                <p>Ami(e)s</p>
                <span>0</span>
              </div>
            </Link>
          </div>
          <div
            className={`SiderbarTitle ${
              select === "doc" ? "siderbaractive" : ""
            }`}
            onClick={() => setselect("doc")}
          >
            <Link to="/home/document">
              <div className="SiderbarIcone">
                <img src={img3} alt="" />
                <p>Documents</p>
              </div>
            </Link>
          </div>
          <div
            className={`SiderbarTitle ${
              select === "result" ? "siderbaractive" : ""
            }`}
            onClick={() => setselect("result")}
          >
            <Link to="/home/result">
              <div className="SiderbarIcone">
                <img src={img4} alt="" />
                <p>Résultats</p>
              </div>
            </Link>
          </div>
          <div
            className={`SiderbarTitle ${
              select === "dash" ? "siderbaractive" : ""
            }`}
            onClick={() => setselect("dash")}
          >
            <Link to="/home/dashboard">
              <div className="SiderbarIcone">
                <img src={img5} alt="" />
                <p>Dashboard</p>
              </div>
            </Link>
          </div>
        </div>
        <div className="SiderbarHeaderBottom">
          <div
            className={`SiderbarTitle ${
              select === "para" ? "siderbaractive" : ""
            }`}
            onClick={() => setselect("para")}
          >
            <Link to="/home/parametre">
              <div className="SiderbarIcone">
                <img src={img6} alt="" />
                <p>Paramètres</p>
              </div>
            </Link>
          </div>
          <div className="SiderbarTitles">
            <img src={img7} alt="" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
