import { useState, type ChangeEvent, useRef, useEffect } from "react";
import { Friends } from "../store/Frontbdd";
import img1 from "../assets/icone/ami.png";
import "../style/ami.css";
import Emoji from "../components/layout/Emoji";
import logo from "../assets/icone/logo.png";

interface Message {
  id: string;
  message: string;
  time: string;
  isEmojiOnly?: boolean; // ? pour dire optionnel
  timestamp: number;
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
  const [userfilter, setuserfilter] = useState<Friends[]>(Friends);
  const refemoji = useRef<HTMLDivElement | null>(null);
  const refslider = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const handlemoj = (e: MouseEvent) => {
      if (refemoji.current && !refemoji.current.contains(e.target as Node)) {
        setshowemoji(false);
      }
    };
    document.addEventListener("mousedown", handlemoj);
    return () => {
      document.removeEventListener("mousedown", handlemoj);
    };
  }, []);

  const handleclose = () => {
    setopen(false);
  };
  const handleWriting = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const dimitri = e.target.value;
    setwrite(dimitri);
  };
  const handleEmojiSelect = (emoji: any) => {
    setwrite((prev) => prev + emoji.emoji);
  };
  const isEmojiOnly = (text: string) =>
    /^[\p{Extended_Pictographic}\s]+$/u.test(text);

  const cleanMessage = (text: string) => {
    // Supprime les espaces ET les sauts de ligne vides à la fin
    return text.replace(/[\s\n\r]+$/g, "");
  };
  const handlesend = () => {
    if (!showUser || write.trim() === "") {
      return;
    }
    const cleanText = cleanMessage(write);
    const emojiOnly = isEmojiOnly(write.trim());
    const iduser = Date.now() + "" + Math.random().toString(36).substring(2, 9);
    const hours = new Date().getHours().toString().padStart(2, "0");
    const minutes = new Date().getMinutes().toString().padStart(2, "0");
    //dans notre tableau userSms on garde les anciens messages prev
    //pour l'user showUser.id on affiche ses anciens messages ou un tableau vide
    setuserSms((prev) => ({
      ...prev,
      [showUser.id]: [
        ...(prev[showUser.id] || []),
        {
          id: iduser,
          message: cleanText,
          time: `${hours}:${minutes}`,
          isEmojiOnly: emojiOnly,
          timestamp: Date.now(),
        },
      ],
    }));
    setwrite("");
  };
  const handleSelect = (p: Friends) => {
    setshowUser(p);
  };
  const handleChangeAll = (e: ChangeEvent<HTMLInputElement>) => {
    const dimi = e.target.value;
    settextesearch(dimi);
    setuserfilter(
      dimi
        ? Friends.filter((p) =>
            p.name.toLowerCase().includes(dimi.toLowerCase()),
          )
        : Friends,
    );
  };
  const handleClick = () => {
    alert("clic sur un lien");
  };

  const renderMessage = (text: string) => {
    // Détection du lien "start.....quiz-IA"
    const regex = /(start\S*quiz-IA)/g;

    return text.split("\n").map((line, index, array) => {
      const parts = line.split(regex);

      return (
        <div key={index}>
          {parts.map((part, partIndex) => {
            if (regex.test(part)) {
              return (
                <span
                  key={`${index}-${partIndex}`}
                  className="quiz-link"
                  onClick={handleClick}
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
    if (usersend) {
      const user = Friends.find((p) => p.id === usersend);
      if (user) {
        handleSelect(user);
        setselectUser(user.id);
      }
    }
  }, [usersend]);
  //defilement vers derniers sms
  useEffect(() => {
    if (refslider.current) {
      refslider.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [userSms[showUser?.id || 0]]);

  const getLastMessageTimestamp = (userId: number): number => {
    const messages = userSms[userId] || [];
    if (messages.length === 0) {
      return 0;
    }
    //trouver le dernier message
    return Math.max(...messages.map((message) => message.timestamp));
  };
  const getSortedMessages = () => {
    return [...userfilter].sort((a, b) => {
      const lastMessageA = getLastMessageTimestamp(a.id);
      const lastMessageB = getLastMessageTimestamp(b.id);
      return lastMessageB - lastMessageA;
    });
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
            name=""
            id=""
            placeholder="saisir le nom de votre ami(e)s"
          />
        </div>
        <div className="FriendsMain">
          {userfilter.length > 0 ? (
            <>
              {getSortedMessages().map((p) => (
                <div
                  className={`FriendsMainItems ${selectUser === p.id ? "active" : ""}`}
                  key={p.id}
                  onClick={() => {
                    setselectUser(p.id);
                    handleSelect(p);
                  }}
                >
                  <img src={p.photo} alt="" />
                  <p>{p.name}</p>
                  <span>10</span>
                </div>
              ))}
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
                <img src={showUser.photo} alt="" />
                <span>🟢</span>
              </div>
              <p>{showUser.name}</p>
            </div>

            <div className="SmsMain">
              {(userSms[showUser.id] || []).map((p, index) => (
                <div className="SmsMainContent" key={`${p.id}-${index}`}>
                  <div className="SmsHome">
                    <p className={p.isEmojiOnly ? "emojiOnly" : ""}>
                      {renderMessage(p.message)}
                    </p>
                    <span>{p.time}</span>
                  </div>
                  <p className="views">✔️✔️</p>
                </div>
              ))}

              {/* Exemple d'un message venant de l'autre personne */}
              <div className="SmsMainContentAway">
                <p>✔️✔️</p>
                <div className="SmsAway">
                  <p>
                    Lorem ipsum dolor sit amet consectetur, adipisicing elit.
                    Amet accusamus modi dolores nam vel voluptatum magnam
                    ducimus, facilis totam minus nulla veniam molestias a
                    debitis animi unde sunt assumenda non.
                  </p>
                  <span>10:00</span>
                </div>
              </div>
              <div className="" ref={refslider}></div>
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
                  placeholder="saisir votre message et envoyer"
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
            <img src={logo} alt="" />
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;
