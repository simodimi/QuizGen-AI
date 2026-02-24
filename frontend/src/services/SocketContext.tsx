import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContextUser";
import logo from "../assets/icone/logo.png";
import connect from "./Util";

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: number[];
  typingUsers: Record<number, boolean>;
  numbersms: number;
  setnumbersms: React.Dispatch<React.SetStateAction<number>>;
  unreadCounts: Record<number, number>;
  setUnreadCounts: React.Dispatch<React.SetStateAction<Record<number, number>>>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<number, boolean>>({});
  const [numbersms, setnumbersms] = useState<number>(0);
  const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});
  const { user } = useAuth();

  // Fonction pour recharger les compteurs depuis l'API
  const fetchUnreadCounts = async () => {
    try {
      const res = await connect.get("/api/messages/unread");
      const counts = res.data.counts;
      const total = counts.reduce(
        (sum: number, item: any) => sum + item.unreadCount,
        0,
      );

      setnumbersms(total);

      const countsMap: Record<number, number> = {};
      counts.forEach((item: any) => {
        countsMap[item.userId] = item.unreadCount;
      });
      setUnreadCounts(countsMap);

      console.log("Compteurs rechargés:", { total, countsMap });
    } catch (error) {
      console.error("Erreur chargement compteurs:", error);
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    console.log("Initialisation Socket.IO...");

    const newSocket = io("http://localhost:5000", {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      query: {
        userId: user.id.toString(),
      },
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Socket connecté avec ID:", newSocket.id);
      newSocket.emit("join_user_room", user.id);
      newSocket.emit("get_online_users");

      // Charger les compteurs au démarrage
      fetchUnreadCounts();
    });

    // GESTIONNAIRE UNIQUE POUR LE COMPTEUR GLOBAL
    newSocket.on("chat:global_unread_update", (data: any) => {
      console.log("Mise à jour compteur GLOBAL reçue:", data);

      if (data.userId === user?.id && data.totalUnread !== undefined) {
        setnumbersms(data.totalUnread);
      }
    });

    // GESTIONNAIRE POUR LES NOUVEAUX MESSAGES
    newSocket.on("chat:receive", (newMessage: any) => {
      console.log("Nouveau message reçu dans SocketContext:", newMessage);

      if (newMessage.receiverId === user?.id) {
        // Mettre à jour le compteur INDIVIDUEL
        setUnreadCounts((prev) => ({
          ...prev,
          [newMessage.senderId]: (prev[newMessage.senderId] || 0) + 1,
        }));

        // Incrémenter le compteur GLOBAL
        setnumbersms((prev) => prev + 1);

        // Notification browser
        if (Notification.permission === "granted") {
          new Notification(
            `Message de ${newMessage.sender?.userName || "Inconnu"}`,
            {
              body: newMessage.content?.substring(0, 50) + "...",
              icon: logo,
            },
          );
        }
      }
    });

    // QUAND LES MESSAGES SONT LUS
    newSocket.on("chat:messages_read", (data: any) => {
      console.log("Messages lus:", data);

      if (data.readerId === user?.id) {
        // Recharger les compteurs pour être sûr
        fetchUnreadCounts();
      }
    });

    // Gestion des utilisateurs en ligne
    newSocket.on("online_users", (users: number[]) => {
      console.log("Utilisateurs en ligne:", users);
      setOnlineUsers(users);
    });

    newSocket.on("user_online", (userId: number) => {
      console.log(`Utilisateur ${userId} est en ligne`);
      setOnlineUsers((prev) => {
        if (!prev.includes(userId)) {
          return [...prev, userId];
        }
        return prev;
      });
    });

    newSocket.on("user_offline", (userId: number) => {
      console.log(`Utilisateur ${userId} est hors ligne`);
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    });

    // Gestion de la frappe
    newSocket.on(
      "typing:status",
      ({ userId, isTyping }: { userId: number; isTyping: boolean }) => {
        setTypingUsers((prev) => ({
          ...prev,
          [userId]: isTyping,
        }));
      },
    );

    newSocket.on("connect_error", (error) => {
      console.error("Erreur de connexion Socket.IO:", error);
    });

    // Intervalle de rafraîchissement des compteurs (backup)
    const interval = setInterval(fetchUnreadCounts, 30000);

    return () => {
      console.log("🧹 Nettoyage Socket.IO");
      newSocket.off("chat:receive");
      newSocket.off("chat:global_unread_update");
      newSocket.off("chat:messages_read");
      newSocket.off("online_users");
      newSocket.off("user_online");
      newSocket.off("user_offline");
      newSocket.off("typing:status");
      newSocket.disconnect();
      clearInterval(interval);
    };
  }, [user?.id]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        onlineUsers,
        typingUsers,
        numbersms,
        setnumbersms,
        unreadCounts,
        setUnreadCounts,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
