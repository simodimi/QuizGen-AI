import img1 from "../../assets/icone/q.png";
import img2 from "../../assets/icone/ami.png";
import img3 from "../../assets/icone/doc.png";
import img4 from "../../assets/icone/result.png";
import img6 from "../../assets/icone/para.png";
import img7 from "../../assets/icone/quiz.png";
import img8 from "../../assets/icone/sms.png";
import "../../style/home.css";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../services/AuthContextUser";
import { useSocket } from "../../services/SocketContext";
import connect from "../../services/Util";

const Sidebar = () => {
  const [select, setselect] = useState<string>("quiz");
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const location = useLocation();
  const { user } = useAuth();
  const { socket, numbersms, setnumbersms } = useSocket();

  useEffect(() => {
    console.log(" Sidebar - numbersms actuel:", numbersms);
  }, [numbersms]);

  // Charger le nombre initial de demandes en attente
  useEffect(() => {
    if (!user?.id) return;

    const fetchPendingRequests = async () => {
      try {
        const res = await connect.get("/api/friends/received");
        setPendingRequestsCount(res.data.requests.length);
      } catch (error) {
        console.error("Erreur chargement demandes:", error);
      }
    };
    fetchPendingRequests();
  }, [user?.id]);

  // Fonction pour recharger les compteurs
  const fetchUnreadCounts = async () => {
    try {
      const res = await connect.get("/api/messages/unread");
      const total = res.data.counts.reduce(
        (sum: number, item: any) => sum + item.unreadCount,
        0,
      );
      setnumbersms(total);
    } catch (error) {
      console.error("Erreur chargement compteurs:", error);
    }
  };

  //  ÉCOUTE DES ÉVÉNEMENTS SOCKET POUR LA SIDEBAR
  useEffect(() => {
    if (!socket) return;

    console.log(" Sidebar - Initialisation des écouteurs socket");

    // Écouter DIRECTEMENT les nouveaux messages
    socket.on("chat:receive", (newMessage: any) => {
      console.log(" Sidebar détecte nouveau message de:", newMessage.senderId);

      if (newMessage.receiverId === user?.id) {
        // Incrémenter le compteur GLOBAL
        setnumbersms((prev) => prev + 1);
        console.log(" Sidebar - compteur incrémenté à", numbersms + 1);
      }
    });

    // Écouter les mises à jour globales du compteur
    socket.on("chat:global_unread_update", (data: any) => {
      console.log("Sidebar - mise à jour compteur global:", data);

      if (data.userId === user?.id && data.totalUnread !== undefined) {
        setnumbersms(data.totalUnread);
      }
    });

    // Écouter les demandes d'amis
    socket.on("friend_request_received", () => {
      setPendingRequestsCount((prev) => prev + 1);
    });

    socket.on("friend_request_responded", ({ responderId }) => {
      if (responderId === user?.id) {
        setPendingRequestsCount((prev) => Math.max(0, prev - 1));
      }
    });

    socket.on("friend_request_cancelled", () => {
      setPendingRequestsCount((prev) => Math.max(0, prev - 1));
    });

    socket.on("friends_updated", async () => {
      try {
        const res = await connect.get("/api/friends/received");
        setPendingRequestsCount(res.data.requests.length);
      } catch (error) {
        console.error("Erreur mise à jour compteur:", error);
      }
    });

    //  Intervalle de rafraîchissement (backup)
    const interval = setInterval(fetchUnreadCounts, 30000);

    return () => {
      console.log("🧹 Sidebar - nettoyage des écouteurs");
      socket.off("chat:receive");
      socket.off("chat:global_unread_update");
      socket.off("friend_request_received");
      socket.off("friend_request_responded");
      socket.off("friend_request_cancelled");
      socket.off("friends_updated");
      clearInterval(interval);
    };
  }, [socket, user?.id, setnumbersms]);

  useEffect(() => {
    if (
      location.pathname === "/home" ||
      location.pathname.startsWith("/home/quiz") ||
      location.pathname.startsWith("/home/multi")
    )
      setselect("quiz");
    if (location.pathname === "/home/ami") setselect("ami");
    if (location.pathname === "/home/document") setselect("doc");
    if (location.pathname === "/home/result") setselect("result");
    if (location.pathname === "/home/dashboard") setselect("dash");
    if (location.pathname === "/home/parametre") setselect("para");
    if (location.pathname === "/home/message") setselect("sms");
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
              select === "sms" ? "siderbaractive" : ""
            }`}
            onClick={() => setselect("sms")}
          >
            <Link to="/home/message">
              <div className="SiderbarIcone">
                <img src={img8} alt="" />
                <p>Messages</p>
                {numbersms > 0 && (
                  <span className="message-badge">{numbersms}</span>
                )}
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
                {pendingRequestsCount > 0 && (
                  <span>{pendingRequestsCount}</span>
                )}
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
              select === "sms" ? "siderbaractive" : ""
            }`}
            onClick={() => setselect("sms")}
          >
            <Link to="/home/message">
              <div className="SiderbarIcone">
                <img src={img8} alt="" />
                <p>Messages</p>
                {numbersms > 0 && (
                  <span className="message-badge">{numbersms}</span>
                )}
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
                {pendingRequestsCount > 0 && (
                  <span>{pendingRequestsCount}</span>
                )}
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
