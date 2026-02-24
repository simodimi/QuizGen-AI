import { useState, type ChangeEvent, useRef, useEffect } from "react";
import "../style/ami.css";
import Emoji from "../components/layout/Emoji";
import logo from "../assets/icone/logo.png";
import connect from "../services/Util";
import { useAuth } from "../services/AuthContextUser";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../services/SocketContext";

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
  const [write, setwrite] = useState<string>("");
  const [showemoji, setshowemoji] = useState<boolean>(false);
  const [userSms, setuserSms] = useState<Record<string, Message[]>>({});
  const [selectUser, setselectUser] = useState<number | null>(null);
  const [showUser, setshowUser] = useState<Friends | null>(null);
  const [textesearch, settextesearch] = useState<string>("");
  const [userfilter, setuserfilter] = useState<Friends[]>([]);
  const [friends, setfriends] = useState<Friends[]>([]);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [typingTimeout, setTypingTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const refemoji = useRef<HTMLDivElement | null>(null);
  const refslider = useRef<HTMLDivElement | null>(null);
  const { user } = useAuth();
  const currentMessages = selectUser !== null ? userSms[selectUser] || [] : [];
  const navigate = useNavigate();
  const { socket, onlineUsers, typingUsers, unreadCounts } = useSocket();

  // Initialisation Socket.IO
  useEffect(() => {
    if (!socket) return;

    // Écouter les nouveaux messages
    socket.on("chat:receive", (newMessage: any) => {
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

      // Si on est dans la conversation, marquer comme lu
      if (selectUser === conversationId) {
        markMessageAsRead(conversationId);
      }
    });

    // Quand l'autre utilisateur lit mes messages
    socket.on("chat:messages_read", ({ readerId, messageIds }) => {
      console.log("Messages lus par l'autre:", { readerId, messageIds });

      if (readerId !== user?.id) {
        setuserSms((prev) => {
          const updated = { ...prev };
          Object.keys(updated).forEach((convId) => {
            updated[convId] = updated[convId].map((msg) => {
              if (msg.senderId === user?.id && msg.receiverId === readerId) {
                return { ...msg, isRead: true };
              }
              return msg;
            });
          });
          return updated;
        });
      }
    });

    // Notifications
    socket.on("chat:notification", (notification: any) => {
      if (notification.senderId !== selectUser) {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(`Nouveau message de ${notification.senderName}`, {
            body: notification.preview,
            icon: logo,
          });
        }
      }
    });

    // Gestion des erreurs
    socket.on("connect_error", (error) => {
      console.error("Erreur de connexion Socket.IO:", error);
    });

    // Demander la permission pour les notifications
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => {
      console.log("Nettoyage Socket.IO dans Message");
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      socket.off("chat:receive");
      socket.off("chat:messages_read");
      socket.off("chat:notification");
      socket.off("connect_error");
    };
  }, [socket, user?.id, selectUser]);

  // Mettre à jour quand selectUser change
  useEffect(() => {
    if (socket && selectUser && user?.id) {
      // Marquer les messages comme lus
      markMessageAsRead(selectUser);
    }
  }, [selectUser, socket, user?.id]);

  // Fonction pour marquer les messages comme lus
  const markMessageAsRead = async (senderId: number) => {
    try {
      console.log("Marquage des messages comme lus pour:", senderId);

      const response = await connect.post(`/api/messages/${senderId}/read`);
      console.log("Réponse markAsRead:", response.data);

      if (response.data.success) {
        // Mettre à jour LOCALEMENT les messages comme lus
        setuserSms((prev) => {
          const updated = { ...prev };
          const conversationMessages = updated[senderId] || [];

          updated[senderId] = conversationMessages.map((msg) => ({
            ...msg,
            isRead: true,
          }));

          return updated;
        });

        if (socket) {
          socket.emit("chat:read_conversation", {
            otherUserId: senderId,
          });
        }
      }
    } catch (error) {
      console.error("Erreur markAsRead:", error);
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

        setuserSms((prev) => {
          const updated = { ...prev };
          updated[id] = messages;
          return updated;
        });

        // Si on est dans cette conversation, marquer comme lu
        if (selectUser === id) {
          await markMessageAsRead(id);
        }

        return messages;
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
      socket.emit("typing:start", {
        userId: user.id,
        receiverId: showUser.id,
      });

      setIsTyping(true);

      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

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

  const renderMessage = (text: string) => {
    const regex = /(start\S*quiz-IA)/g;

    return text.split("\n").map((line, index, array) => {
      const parts = line.split(regex);

      return (
        <div key={index}>
          {parts.map((part, partIndex) => {
            if (part && part.match(/^start.*quiz-IA$/)) {
              const code = part.replace("start", "").replace("quiz-IA", "");

              return (
                <span
                  key={`${index}-${partIndex}`}
                  className="quiz-link"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Lien quiz cliqué:", part, "Code:", code);
                    toast.info(`🎮 Redirection vers le quiz...`);
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
        const friendsRes = await connect.get("/api/friends");

        const friendsList = friendsRes.data.friends.map((f: any) => ({
          id: f.friend.id,
          name: f.friend.userName,
          photo: f.friend.userPhoto || "",
        }));

        setuserfilter(friendsList);
        setfriends(friendsList);

        // Initialiser userSms
        const initialSms: Record<string, Message[]> = {};
        friendsList.forEach((friend: Friends) => {
          initialSms[friend.id] = [];
        });
        setuserSms(initialSms);
      } catch (err) {
        console.error("Erreur chargement amis:", err);
      }
    };

    fetchFriends();
  }, []);

  const isUserOnline = (userId: number) => {
    return onlineUsers.includes(userId);
  };

  const formatDateSeparator = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Hier";
    } else {
      return date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  };

  const shouldShowDateSeparator = (
    currentMessage: Message,
    previousMessage: Message | undefined,
  ) => {
    if (!previousMessage) return true;

    const currentDate = new Date(currentMessage.timestamp).toDateString();
    const previousDate = new Date(previousMessage.timestamp).toDateString();

    return currentDate !== previousDate;
  };
 useEffect(() => {
  const disappear=(e: MouseEvent)=>{
    if (refemoji.current && !refemoji.current.contains(e.target as Node)) {
      setshowemoji(false);
    }
  }
 document.addEventListener("mousedown",disappear);
   return () => {
     document.removeEventListener("mousedown",disappear);
   }
 }, [refemoji]);
 
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
                const unreadCount = unreadCounts[p.id] || 0;
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

            <div
              className="SmsMain"
              style={{
                backgroundImage: `url(${user?.background_image})`,
                fontFamily: user?.policeStyle,
              }}
            >
              {currentMessages.map((p, index) => {
                const iscurrentuser = p.senderId === user?.id;
                const previousMessage =
                  index > 0 ? currentMessages[index - 1] : undefined;
                const showDateSeparator = shouldShowDateSeparator(
                  p,
                  previousMessage,
                );
                return (
                  <div className="" key={`${p.id}-${index}`}>
                    {showDateSeparator && (
                      <div className="date-separator">
                        <span>{formatDateSeparator(p.timestamp)}</span>
                      </div>
                    )}

                    <div className="message-container">
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
                          <div className="message-status">
                            <span className="read-status">
                              {p.isRead ? "✔️✔️" : "✔️"}
                            </span>
                          </div>
                          <div className="SmsAway">
                            <p className={p.isEmojiOnly ? "emojiOnly" : ""}>
                              {renderMessage(p.message)}
                            </p>
                            <span className="message-time">{p.time}</span>
                          </div>
                        </div>
                      )}
                    </div>
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
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;
