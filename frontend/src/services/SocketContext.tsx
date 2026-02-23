import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContextUser";

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: number[];
  typingUsers: Record<number, boolean>;
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
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    console.log("🔌 Initialisation Socket.IO au niveau global...");

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
      console.log("✅ Socket connecté avec ID:", newSocket.id);
      newSocket.emit("join_user_room", user.id);
      newSocket.emit("get_online_users");
    });

    // Gestion des utilisateurs en ligne
    newSocket.on("online_users", (users: number[]) => {
      console.log("👥 Utilisateurs en ligne:", users);
      setOnlineUsers(users);
    });

    newSocket.on("user_online", (userId: number) => {
      console.log(`🟢 Utilisateur ${userId} est en ligne`);
      setOnlineUsers((prev) => {
        if (!prev.includes(userId)) {
          return [...prev, userId];
        }
        return prev;
      });
    });

    newSocket.on("user_offline", (userId: number) => {
      console.log(`⚫ Utilisateur ${userId} est hors ligne`);
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    });

    // Gestion de la frappe (global)
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
      console.error("❌ Erreur de connexion Socket.IO:", error);
    });

    return () => {
      console.log("🧹 Nettoyage Socket.IO global");
      newSocket.disconnect();
    };
  }, [user?.id]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, typingUsers }}>
      {children}
    </SocketContext.Provider>
  );
};
