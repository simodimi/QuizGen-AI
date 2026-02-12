import { useState, type ChangeEvent, useRef, useEffect } from "react";
import { io, Socket } from "socket.io-client";

import "../style/ami.css";
import Emoji from "../components/layout/Emoji";
import logo from "../assets/icone/logo.png";
import connect from "../services/Util";
import { useAuth } from "../services/AuthContextUser";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  message: string;
  content?: string;
  time: string;
  isEmojiOnly?: boolean;
  timestamp: number;
  isRead?: boolean;
  messageType?: string;
  createdAt?: string;
}

interface Friends {
  id: number;
  name: string;
  photo?: string;
  requestId?: number;
  receiverId?: number;
  isFriend?: boolean;
  hasSentRequest?: boolean;
  hasReceivedRequest?: boolean;
}

interface AmiProps {
  usersend: number | null;
}

const Message = ({ usersend }: AmiProps) => {
  const [open, setopen] = useState<boolean>(false);
  const [write, setwrite] = useState<string>("");
  const [showemoji, setshowemoji] = useState<boolean>(false);
  const [userSms, setuserSms] = useState<Record<string, Message[]>>({});
  const [selectUser, setselectUser] = useState<number | null>(null);
  const [showUser, setshowUser] = useState<Friends | null>(null);
  const [textesearch, settextesearch] = useState<string>("");
  const [userfilter, setuserfilter] = useState<Friends[]>([]);
  const [friends, setfriends] = useState<Friends[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<number, boolean>>({});
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [typingTimeout, setTypingTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const refemoji = useRef<HTMLDivElement | null>(null);
  const refslider = useRef<HTMLDivElement | null>(null);
  const { user } = useAuth();
  const currentMessages = selectUser !== null ? userSms[selectUser] || [] : [];
  const navigate = useNavigate();

  // Initialisation Socket.IO
  useEffect(() => {
    console.log("Initialisation Socket.IO...");

    // Initialiser Socket.IO
    const newSocket = io("http://localhost:5000", {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      query: {
        userId: user?.id?.toString(),
      },
    });

    setSocket(newSocket);

    console.log("Socket créé avec ID:", newSocket.id);

    // Écouter la connexion réussie
    newSocket.on("connect", () => {
      console.log("Socket connecté avec ID:", newSocket.id);

      // Rejoindre la room utilisateur
      if (user?.id) {
        newSocket.emit("join_user_room", user.id);
        console.log(`Utilisateur ${user.id} a rejoint sa room`);

        // Demander les utilisateurs en ligne
        newSocket.emit("get_online_users");
      }
    });

    // Écouter les nouveaux messages
    /* newSocket.on("chat:receive", (newMessage: any) => {
      console.log("Nouveau message reçu via Socket:", newMessage);

      // Déterminer l'ID de la conversation
      const conversationId =
        newMessage.senderId === user?.id
          ? newMessage.receiverId
          : newMessage.senderId;

      // Vérifier si c'est pour la conversation actuelle
      if (conversationId === selectUser || !selectUser) {
        // Formater le message
        const formattedMessage = {
          id: newMessage.id || Date.now(),
          senderId: newMessage.senderId,
          receiverId: newMessage.receiverId,
          message: newMessage.content || newMessage.message,
          time: new Date(newMessage.createdAt || Date.now()).toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute: "2-digit",
            },
          ),
          timestamp: new Date(newMessage.createdAt || Date.now()).getTime(),
          isRead: newMessage.isRead || false,
          isEmojiOnly: isEmojiOnly(newMessage.content || ""),
        };

        console.log(
          "Message formaté pour conversation:",
          conversationId,
          formattedMessage,
        );

        // Ajouter le message à la conversation
        setuserSms((prev) => {
          const currentConv = prev[conversationId] || [];
          const messageExists = currentConv.some(
            (msg) => msg.id === formattedMessage.id,
          );

          if (messageExists) {
            console.log("Message déjà présent, ignoré");
            return prev;
          }

          return {
            ...prev,
            [conversationId]: [...currentConv, formattedMessage],
          };
        });
      }
    });*/
    newSocket.on("chat:receive", (newMessage: any) => {
      // 🔥 IGNORER les messages envoyés par moi-même
      if (newMessage.senderId === user?.id) return;

      const conversationId = newMessage.senderId;

      const formattedMessage = {
        id: newMessage.id,
        senderId: newMessage.senderId,
        receiverId: newMessage.receiverId,
        message: newMessage.content,
        time: new Date(newMessage.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        timestamp: new Date(newMessage.createdAt).getTime(),
        isRead: newMessage.isRead,
        isEmojiOnly: isEmojiOnly(newMessage.content),
      };

      setuserSms((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), formattedMessage],
      }));
    });

    // Écouter les messages envoyés
    newSocket.on("chat:sent", (message: any) => {
      console.log("Message envoyé confirmé:", message);

      if (message.receiverId === selectUser) {
        const formattedMessage = {
          id: message.id,
          senderId: message.senderId,
          receiverId: message.receiverId,
          message: message.content,
          time: new Date(message.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          timestamp: new Date(message.createdAt).getTime(),
          isRead: message.isRead,
          isEmojiOnly: isEmojiOnly(message.content),
        };

        setuserSms((prev) => {
          if (selectUser === null) return prev;
          const currentConv = prev[selectUser] || [];
          const messageExists = currentConv.some(
            (msg) => msg.id === formattedMessage.id,
          );

          if (messageExists) return prev;

          return {
            ...prev,
            [selectUser]: [...currentConv, formattedMessage],
          };
        });
      }
    });

    // Indicateur de frappe
    /* newSocket.on(
      "typing:status",
      ({ userId, isTyping: typing }: { userId: number; isTyping: boolean }) => {

        if (userId === selectUser) {
          setTypingUsers((prev) => ({
            ...prev,
            [userId]: typing,
          }));
        }
      },
    );*/
    newSocket.on("typing:status", ({ userId, isTyping }) => {
      setTypingUsers((prev) => ({
        ...prev,
        [userId]: isTyping,
      }));
    });
    newSocket.on("chat:conversation_read", ({ messageIds }) => {
      setuserSms((prev) => {
        const updated = { ...prev };

        Object.keys(updated).forEach((convId) => {
          updated[convId] = updated[convId].map((msg) =>
            messageIds?.includes(msg.id) ? { ...msg, isRead: true } : msg,
          );
        });

        return updated;
      });
    });

    // Utilisateurs en ligne
    newSocket.on("online_users", (users: number[]) => {
      console.log("Liste des utilisateurs en ligne:", users);
      setOnlineUsers(users);
    });

    newSocket.on("user_online", (userId: number) => {
      console.log(`Utilisateur ${userId} est maintenant en ligne`);
      setOnlineUsers((prev) => {
        if (!prev.includes(userId)) {
          return [...prev, userId];
        }
        return prev;
      });
    });

    newSocket.on("user_offline", (userId: number) => {
      console.log(`Utilisateur ${userId} est maintenant hors ligne`);
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    });

    // Notifications
    newSocket.on("chat:notification", (notification: any) => {
      console.log("Notification reçue:", notification);

      if (notification.senderId !== selectUser) {
        // Afficher une notification
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(`Nouveau message de ${notification.senderName}`, {
            body: notification.preview,
            icon: logo,
          });
        }
      }
    });

    // Gestion des erreurs
    newSocket.on("connect_error", (error) => {
      console.error("Erreur de connexion Socket.IO:", error);
    });

    // Demander la permission pour les notifications
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => {
      console.log("Nettoyage Socket.IO");
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      newSocket.disconnect();
    };
  }, [user?.id]);

  // Mettre à jour quand selectUser change
  useEffect(() => {
    if (socket && selectUser && user?.id) {
      // Rejoindre la room de l'utilisateur sélectionné
      socket.emit("join_user_room", selectUser);

      // Marquer les messages comme lus
      markMessageAsRead(selectUser);
    }
  }, [selectUser, socket, user?.id]);

  // Fonction pour marquer les messages comme lus
  const markMessageAsRead = async (senderId: number) => {
    try {
      await connect.post(`/api/messages/${senderId}/read`);
      if (socket) {
        socket.emit("chat:conversation_read", { senderId });
      }
    } catch (error) {
      console.error("Erreur lors du marquage comme lu:", error);
    }
  };

  // Chargement des messages
  const loadsms = async (id: number) => {
    try {
      const res = await connect.get(`/api/messages/conversation/${id}`);
      console.log("Messages chargés depuis API:", res.data);

      if (res.data.success) {
        const messages = res.data.messages.map((p: any) => ({
          id: p.id,
          senderId: p.senderId,
          receiverId: p.receiverId,
          message: p.content,
          content: p.content,
          time: new Date(p.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          timestamp: new Date(p.createdAt).getTime(),
          isRead: p.isRead,
          isEmojiOnly: isEmojiOnly(p.content),
        }));

        setuserSms((prev) => ({
          ...prev,
          [id]: messages,
        }));

        // Marquer les messages comme lus
        await markMessageAsRead(id);
      }
    } catch (error) {
      console.error("Erreur chargement messages:", error);
    }
  };

  const handleWriting = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setwrite(text);

    // Gestion de l'indicateur de frappe
    if (socket && showUser?.id && user?.id) {
      // Émettre que l'utilisateur est en train d'écrire au DESTINATAIRE
      socket.emit("typing:start", {
        userId: user.id,
        receiverId: showUser.id,
      });

      setIsTyping(true);

      // Effacer le timeout précédent
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      // Définir un nouveau timeout pour arrêter l'indicateur
      const newTimeout = setTimeout(() => {
        if (socket && showUser?.id && user?.id) {
          socket.emit("typing:stop", {
            userId: user.id,
            receiverId: showUser.id,
          });
        }
        setIsTyping(false);
      }, 1000);

      setTypingTimeout(newTimeout);
    }
  };

  const handleEmojiSelect = (emoji: any) => {
    setwrite((prev) => prev + emoji.emoji);
  };

  const isEmojiOnly = (text: string) => {
    const emojiRegex = /^[\p{Emoji}\s]+$/u;
    return emojiRegex.test(text.trim());
  };

  const cleanMessage = (text: string) => {
    return text.replace(/[\s\n\r]+$/g, "");
  };

  const handlesend = async () => {
    if (!showUser || write.trim() === "" || !socket || !user?.id) {
      toast.error("veuillez saisir un message avant d'envoyer");
      return;
    }

    const cleanText = cleanMessage(write);
    const emojiOnly = isEmojiOnly(write.trim());

    console.log("Envoi du message:", cleanText);

    // Arrêter l'indicateur de frappe
    if (showUser?.id && user?.id) {
      socket.emit("typing:stop", {
        userId: user.id,
        receiverId: showUser.id,
      });
      setIsTyping(false);
    }

    const hours = new Date().getHours().toString().padStart(2, "0");
    const minutes = new Date().getMinutes().toString().padStart(2, "0");

    // Message optimiste
    const optimisticMessage = {
      id: Date.now(),
      senderId: user.id,
      receiverId: showUser.id,
      message: cleanText,
      content: cleanText,
      time: `${hours}:${minutes}`,
      isEmojiOnly: emojiOnly,
      timestamp: Date.now(),
      isRead: false,
      messageType: "text",
    };

    console.log("Message optimiste créé:", optimisticMessage);

    // Mise à jour optimiste
    setuserSms((prev) => {
      const currentConv = prev[showUser.id] || [];
      return {
        ...prev,
        [showUser.id]: [...currentConv, optimisticMessage],
      };
    });

    setwrite("");

    try {
      console.log("Envoi API du message...");
      const response = await connect.post("/api/messages", {
        receiverId: showUser.id,
        content: cleanText,
        messageType: "text",
      });

      console.log("Réponse API:", response.data);

      if (response.data.success) {
        const realMessage = response.data.message;
        console.log("Message réel créé:", realMessage);

        // Remplacer le message optimiste
        setuserSms((prev) => {
          const currentConv = prev[showUser.id] || [];
          return {
            ...prev,
            [showUser.id]: currentConv.map((msg) =>
              msg.id === optimisticMessage.id
                ? {
                    ...msg,
                    id: realMessage.id,
                    createdAt: realMessage.createdAt,
                    time: new Date(realMessage.createdAt).toLocaleTimeString(
                      [],
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    ),
                  }
                : msg,
            ),
          };
        });

        // Émettre l'événement
        socket.emit("message:sent", {
          messageId: realMessage.id,
          receiverId: showUser.id,
        });
      }
    } catch (error: any) {
      console.error("Erreur envoi message:", error);

      // En cas d'erreur, retirer le message optimiste
      setuserSms((prev) => {
        const currentConv = prev[showUser.id] || [];
        return {
          ...prev,
          [showUser.id]: currentConv.filter(
            (msg) => msg.id !== optimisticMessage.id,
          ),
        };
      });

      // Remettre le texte
      setwrite(cleanText);
    }
  };

  const handleSelect = async (p: Friends) => {
    console.log("Sélection de l'ami:", p);
    setshowUser(p);
    setselectUser(p.id);

    // Charger les messages
    await loadsms(p.id);

    // Marquer les messages comme lus
    if (user?.id) {
      await markMessageAsRead(p.id);
    }
  };

  const handleChangeAll = (e: ChangeEvent<HTMLInputElement>) => {
    const searchText = e.target.value;
    settextesearch(searchText);
    setuserfilter(
      searchText
        ? friends.filter((p) =>
            p.name.toLowerCase().includes(searchText.toLowerCase()),
          )
        : friends,
    );
  };

  /*const renderMessage = (text: string) => {
    const regex = /(start\S*quiz-IA)/g;

    return text.split("\n").map((line, index, array) => {
      const parts = line.split(regex);

      return (
        <div key={index}>
          {parts.map((part, partIndex) => {
            if (regex.test(part)) {
              // Le lien est déjà dans le format correct: start123quiz-IA
              const code = part.replace("start", "").replace("quiz-IA", "");

              return (
                <span
                  key={`${index}-${partIndex}`}
                  className="quiz-link"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    console.log("Lien quiz cliqué:", part, "Code:", code);
                    navigate(`/home/multi?code=${code}`);
                    // Afficher un toast pour confirmation
                    toast.info(`Redirection vers le quiz... Code: ${code}`);

                    // Naviguer vers la page quiz multi
                    setTimeout(() => {
                      navigate("/home/multi");
                    }, 500);
                  }}
                >
                  {part}
                </span>
              );
            }
            return part;
          })}
          {index < array.length - 1 && <br />}
        </div>
      );
    });
  };*/
  const renderMessage = (text: string) => {
    // Regex POUR CAPTURER UNIQUEMENT LE FORMAT startXXXquiz-IA
    const regex = /(start\S*quiz-IA)/g;

    return text.split("\n").map((line, index, array) => {
      const parts = line.split(regex);

      return (
        <div key={index}>
          {parts.map((part, partIndex) => {
            // Vérifier si la partie correspond au format startXXXquiz-IA
            if (part && part.match(/^start.*quiz-IA$/)) {
              // Extraire le code
              const code = part.replace("start", "").replace("quiz-IA", "");

              return (
                <span
                  key={`${index}-${partIndex}`}
                  className="quiz-link"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    console.log("🔗 Lien quiz cliqué:", part, "Code:", code);
                    toast.info(`🎮 Redirection vers le quiz...`);

                    // ✅ UNE SEULE NAVIGATION - directe et propre
                    navigate(`/home/multi?code=${code}`);
                  }}
                >
                  {part}
                </span>
              );
            }
            return part;
          })}
          {index < array.length - 1 && <br />}
        </div>
      );
    });
  };
  useEffect(() => {
    if (usersend && friends.length > 0) {
      const foundUser = friends.find((p) => p.id === usersend);
      if (foundUser) {
        handleSelect(foundUser);
      }
    }
  }, [usersend, friends]);

  // Défilement vers le bas
  useEffect(() => {
    if (refslider.current && currentMessages.length > 0) {
      refslider.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentMessages]);

  const getLastMessageTimestamp = (userId: number): number => {
    const messages = userSms[userId] || [];
    if (messages.length === 0) return 0;
    return Math.max(...messages.map((message) => message.timestamp));
  };

  const getSortedMessages = () => {
    return [...userfilter].sort((a, b) => {
      const lastMessageA = getLastMessageTimestamp(a.id);
      const lastMessageB = getLastMessageTimestamp(b.id);
      return lastMessageB - lastMessageA;
    });
  };

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        console.log("Chargement des amis...");
        const res = await connect.get("/api/friends");

        const friendsList = res.data.friends.map((f: any) => ({
          id: f.friend.id,
          name: f.friend.userName,
          photo: f.friend.userPhoto || "",
        }));

        console.log("Amis chargés:", friendsList);
        setuserfilter(friendsList);
        setfriends(friendsList);

        // Charger les conversations
        const conversationdata: Record<string, Message[]> = {};

        for (const friend of friendsList) {
          try {
            const messagesRes = await connect.get(
              `/api/messages/conversation/${friend.id}`,
              { withCredentials: true },
            );

            if (messagesRes.data.success) {
              conversationdata[friend.id] = messagesRes.data.messages.map(
                (msg: any) => ({
                  id: msg.id,
                  senderId: msg.senderId,
                  receiverId: msg.receiverId,
                  message: msg.content,
                  content: msg.content,
                  time: new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  timestamp: new Date(msg.createdAt).getTime(),
                  isRead: msg.isRead,
                  isEmojiOnly: isEmojiOnly(msg.content),
                }),
              );
            }
          } catch (error) {
            console.log(`Erreur chargement messages ${friend.id}:`, error);
            conversationdata[friend.id] = [];
          }
        }

        console.log("Conversations chargées:", conversationdata);
        setuserSms(conversationdata);
      } catch (err) {
        console.error("Erreur chargement amis:", err);
      }
    };

    fetchFriends();
  }, []);

  const isUserOnline = (userId: number) => {
    return onlineUsers.includes(userId);
  };

  return (
    <div className="headerFriends">
      <div className="headerFriendsLeft">
        <p id="title">Mes ami(e)s</p>
        <div className="filterFriendsAccept">
          <input
            type="search"
            onChange={handleChangeAll}
            value={textesearch}
            placeholder="saisir le nom de votre ami(e)s"
          />
        </div>
        <div className="FriendsMain">
          {userfilter.length > 0 ? (
            <>
              {getSortedMessages().map((p) => {
                const unreadCount =
                  userSms[p.id]?.filter(
                    (msg) => !msg.isRead && msg.senderId === p.id,
                  ).length || 0;

                return (
                  <div
                    className={`FriendsMainItems ${selectUser === p.id ? "active" : ""}`}
                    key={p.id}
                    onClick={() => handleSelect(p)}
                  >
                    <img src={p.photo} alt={p.name} />
                    <div className="flex-column">
                      <p>{p.name}</p>
                      {typingUsers[p.id] && (
                        <p className="text-white">est en train d'écrire...</p>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <span className="unread-count">{unreadCount}</span>
                    )}
                  </div>
                );
              })}
            </>
          ) : (
            <p className="text-center">Aucun ami trouvé 🥲</p>
          )}
        </div>
      </div>
      <div className="headerSmsRight">
        {showUser ? (
          <>
            <div className="headerSmsRightDescription">
              <div className="UserDescribeSms">
                <img
                  src={showUser.photo || "/default-avatar.png"}
                  alt={showUser.name}
                />
                <span> {isUserOnline(showUser.id) ? "🟢" : "⚫"}</span>
              </div>
              <div className="user-info">
                <p className="user-name">{showUser.name}</p>
              </div>
            </div>

            <div className="SmsMain">
              {currentMessages.map((p, index) => {
                const iscurrentuser = p.senderId === user?.id;
                return (
                  <div className="message-container" key={`${p.id}-${index}`}>
                    {iscurrentuser ? (
                      <div className="SmsMainContent">
                        <div className="SmsHome">
                          <p className={p.isEmojiOnly ? "emojiOnly" : ""}>
                            {renderMessage(p.message)}
                          </p>
                          <span className="message-time">{p.time}</span>
                        </div>
                        <div className="message-status">
                          <span
                            className={`read-status ${p.isRead ? "read" : "unread"}`}
                          >
                            {p.isRead ? "✔️✔️" : "✔️"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="SmsMainContentAway">
                        <div className="SmsAway">
                          <p className={p.isEmojiOnly ? "emojiOnly" : ""}>
                            {renderMessage(p.message)}
                          </p>
                          <span className="message-time">{p.time}</span>
                        </div>
                        <div className="message-status">
                          <span className="read-status">
                            {p.isRead ? "✔️✔️" : "✔️"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="scroll-anchor" ref={refslider}></div>
            </div>

            <div className="SmsSend">
              <div className="SmsEmoji">
                <div className="emojilist" ref={refemoji}>
                  {showemoji && <Emoji handleEmojiSelect={handleEmojiSelect} />}
                </div>
                <span onClick={() => setshowemoji(!showemoji)}>😎</span>
                <p>emoji</p>
              </div>
              <div className="SmsTextearea">
                <textarea
                  name="write"
                  value={write}
                  onChange={handleWriting}
                  placeholder="Saisir votre message et cliquer sur le bouton envoyer"
                  spellCheck
                ></textarea>
              </div>
              <div className="Smsbtn">
                <span onClick={handlesend}>📨</span>
                <p>Envoyer</p>
              </div>
            </div>
          </>
        ) : (
          <div id="lauchtext">
            <p>Veuillez choisir un ami(e)s pour commencer la conversation.</p>
            <img src={logo} alt="Logo" />

            {/* Section utilisateurs en ligne 
            <div className="online-users-info">
              <h3>Utilisateurs en ligne ({onlineUsers.length})</h3>
              <div className="online-users-list">
                {friends
                  .filter((friend) => isUserOnline(friend.id))
                  .map((friend) => (
                    <div
                      key={friend.id}
                      className="online-friend-item"
                      onClick={() => handleSelect(friend)}
                    >
                      <img
                        src={friend.photo || "/default-avatar.png"}
                        alt={friend.name}
                      />
                      <span>{friend.name} 🟢</span>
                    </div>
                  ))}
                {friends.filter((friend) => isUserOnline(friend.id)).length ===
                  0 && <p>Aucun ami en ligne pour le moment</p>}
              </div>
            </div>

             Débug Socket.IO 
            <div className="debug-info" style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
              <p>Socket ID: {socket?.id || 'Non connecté'}</p>
              <p>Utilisateur ID: {user?.id || 'Non connecté'}</p>
              <p>Statut Socket: {socket?.connected ? '🟢 Connecté' : '🔴 Déconnecté'}</p>
            </div>*/}
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;
