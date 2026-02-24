import {
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
  useMemo,
  type ChangeEvent,
} from "react";
import { io } from "socket.io-client";

import img2 from "../assets/icone/sms.png";
import img3 from "../assets/para/down.png";
import img4 from "../assets/para/up.png";
import Button from "../components/ui/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import "../style/ami.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../services/AuthContextUser";
import connect from "../services/Util";
import { toast } from "react-toastify";

interface AmiProps {
  setusersend: Dispatch<SetStateAction<number | null>>;
}

// Définition des interfaces
interface User {
  id: number;
  userName: string;
  userPhoto?: string;
}

interface Friend {
  id: number;
  name: string;
  photo?: string;
  requestId?: number;
  receiverId?: number;
  isFriend?: boolean;
  hasSentRequest?: boolean;
  hasReceivedRequest?: boolean;
}

interface SentRequest {
  requestId: number;
  receiverId: number;
  receiveruserName?: string;
}

interface FriendshipDate {
  year: number;
  month: number;
  day: number;
}

const Ami = ({ setusersend }: AmiProps) => {
  const [open, setopen] = useState<boolean>(false);
  const [opendescribe, setopendescribe] = useState<boolean>(false);
  const [texteSearch, settextsearch] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedUserProfil, setSelectedUserProfil] = useState<Friend | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [textsearching, settextsearching] = useState("");
  const [users, setusers] = useState<Friend[]>([]);
  const [usering, setusering] = useState<Friend[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [allUsers, setAllUsers] = useState<Friend[]>([]);
  const [friends, setfriends] = useState<Friend[]>([]);
  const [friendshipDate, setFriendshipDate] = useState<FriendshipDate | null>(
    null,
  );
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSelect = (p: Friend) => {
    setSelectedUserProfil(p);
    setopendescribe(false);
  };

  // Chargement initial des données
  useEffect(() => {
    if (!user?.id) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [friendRes, receiveRes, sendRes, usersRes] = await Promise.all([
          connect.get("api/friends"),
          connect.get("api/friends/received"),
          connect.get("api/friends/sent"),
          connect.get("api/users"),
        ]);

        // 1. Tous les utilisateurs sauf moi
        const usersData = usersRes.data
          .filter((p: User) => p.id !== user?.id)
          .map((p: User) => ({
            id: p.id,
            name: p.userName,
            photo: p.userPhoto,
          }));
        setAllUsers(usersData);

        // 2. Mes amis
        const friends = friendRes.data.friends.map((f: any) => ({
          id: f.friend.id,
          name: f.friend.userName,
          photo: f.friend.userPhoto,
        }));

        setusers(friends);
        setfriends(friends);

        // 3. Demandes reçues
        const receiveResponse = receiveRes.data.requests.map((r: any) => ({
          requestId: r.id,
          id: r.requester.id,
          name: r.requester.userName,
          photo: r.requester.userPhoto,
        }));

        setusering(receiveResponse);

        // 4. Demandes envoyées
        const sendResponse = sendRes.data.requests.map((r: any) => ({
          requestId: r.id,
          receiverId: r.addressee.id,
          name: r.addressee.userName,
          photo: r.addressee.userPhoto,
        }));

        setSentRequests(sendResponse);
      } catch (error: any) {
        console.error("Erreur de chargement détaillée:", error);
        toast.error("Erreur de chargement des données");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return; //si l'user n'est pas connecté

    const s = io("http://localhost:5000", { withCredentials: true });
    s.emit("join_user_room", user.id); //rejoindre la room de l'user
    //reception d'une nouvelle demande d'ami
    s.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      toast.error("Erreur de connexion en temps réel");
    });
    s.on("friend_request_received", (data) => {
      setusering((prev) => {
        //si la demande est deja dans la liste ,on ne duplique pas
        if (prev.some((r) => r.requestId === data.requestId)) return prev;
        // toast.info(`Nouvelle demande d'amitié de ${data.sender.name}`);
        return [
          {
            requestId: data.requestId,
            id: data.sender.id,
            name: data.sender.name,
            image: data.sender.image,
          },
          ...prev,
        ];
      });
    });
    s.on("friends_updated", async () => {
      try {
        const [friendsRes, receivedRes, sentRes, usersRes] = await Promise.all([
          connect.get("api/friends"),
          connect.get("api/friends/received"),
          connect.get("api/friends/sent"),
          connect.get("api/users"),
        ]);

        // amis
        const friends = friendsRes.data.friends.map((f: any) => ({
          id: f.friend.id,
          name: f.friend.userName,
          photo: f.friend.userPhoto || "",
        }));
        setusers(friends);
        setfriends(friends);

        // demande reçue
        setusering(
          receivedRes.data.requests.map((r: any) => ({
            requestId: r.id,
            id: r.requester.id,
            name: r.requester.userName,
            photo: r.requester.userPhoto,
          })),
        );
        // demande envoyée
        setSentRequests(
          sentRes.data.requests.map((r: any) => ({
            requestId: r.id,
            receiverId: r.addressee.id,
            name: r.addressee.userName,
            photo: r.addressee.userPhoto,
          })),
        );

        // tous les users
        const allUsers = usersRes.data
          .filter((u: User) => u.id !== user.id) //on exclut moi-même
          .map((u: User) => ({
            id: u.id,
            name: u.userName,
            photo: u.userPhoto,
          }));

        setAllUsers(allUsers);
      } catch (e) {
        console.error("friends_updated sync error", e);
      }
    });
    // annulation
    s.on("friend_request_cancelled", ({ requestId }) => {
      setusering((prev) => prev.filter((r) => r.requestId !== requestId));
    });
    //réponse à une demande d'ami (acceptée ou refusée)
    s.on("friend_request_responded", ({ responderId, status, user }) => {
      setSentRequests((prev) =>
        prev.filter((req) => req.receiverId !== responderId),
      );

      if (status === "accepter" && user) {
        const newFriend = {
          id: user.id,
          name: user.name,
          photo: user.image,
        };

        setusers((prev) =>
          prev.some((u) => u.id === newFriend.id) ? prev : [...prev, newFriend],
        );
      }
    });

    //suppression
    s.on("friendship_removed", ({ friendId }) => {
      setusers((prev) => prev.filter((u) => u.id !== friendId));
    });

    return () => {
      s.off();
      s.disconnect();
    };
  }, [user?.id]);

  // Préparer la liste des utilisateurs à afficher avec leur statut d'amitié
  const displayUsers = useMemo(() => {
    const friendIds = new Set(users.map((u) => u.id));
    const sentToIds = new Set(sentRequests.map((r) => r.receiverId));
    const receivedFromIds = new Set(usering.map((r) => r.id));

    return allUsers.map((u) => ({
      ...u,
      isFriend: friendIds.has(u.id),
      hasSentRequest: sentToIds.has(u.id),
      hasReceivedRequest: receivedFromIds.has(u.id),
    }));
  }, [allUsers, users, sentRequests, usering]);

  const sendFriendRequest = async (p: Friend) => {
    try {
      const res = await connect.post("/api/friends/request", {
        addresseeId: p.id,
      });

      setSentRequests((prev) => [
        ...prev,
        {
          requestId: res.data.id,
          receiverId: p.id,
          ...res.data,
        },
      ]);
      toast.success("Demande envoyée");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Erreur d'envoi");
    }
  };

  const handlecancel = async (p: Friend) => {
    const request = sentRequests.find((req) => req.receiverId === p.id);
    if (!request) {
      toast.error("Demande non trouvée");
      return;
    }
    try {
      await connect.delete(`/api/friends/${request.requestId}`);
      setSentRequests((prev) =>
        prev.filter((req) => req.requestId !== request.requestId),
      );
      toast.info("Demande annulée");
    } catch (error) {
      console.log(error);
    }
  };

  const respondRequest = async (
    requestId: number,
    status: "accepter" | "refuser",
    p: Friend,
  ) => {
    try {
      await connect.put(`/api/friends/${requestId}/respond`, { status });
      setusering((prev) => prev.filter((r) => r.requestId !== requestId));

      if (status === "accepter") {
        setusers((prev) => [...prev, p]);
        setfriends((prev) => [...prev, p]);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleChangeFilter = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    settextsearch(v);
    setusers(
      v
        ? friends.filter((u) => u.name.toLowerCase().includes(v.toLowerCase()))
        : friends,
    );
  };

  const handleChangeFiltering = (e: ChangeEvent<HTMLInputElement>) => {
    settextsearching(e.target.value);
  };

  const filteredDisplayUsers = useMemo(() => {
    const q = textsearching.trim().toLowerCase();
    if (!q) return displayUsers;
    return displayUsers.filter((u) => u.name.toLowerCase().includes(q));
  }, [displayUsers, textsearching]);

  const handlesendsms = (id: number) => {
    if (!user?.id) return;
    setusersend(id);
    navigate("/home/message");
  };

  useEffect(() => {
    if (!selectedUserProfil?.id) return;

    const fetchFriendshipDate = async () => {
      try {
        const res = await connect.get(
          `/api/friends/${selectedUserProfil.id}/date`,
        );
        setFriendshipDate(res.data.formattedDate || res.data);
      } catch (error) {
        console.error("Erreur date amitié", error);
        setFriendshipDate(null);
      }
    };

    fetchFriendshipDate();
  }, [selectedUserProfil?.id]);

  const handledrop = async (friendId: number) => {
    try {
      await connect.delete(`/api/friends/${friendId}`);
      setusers((prev) => prev.filter((u) => u.id !== friendId));
      setfriends((prev) => prev.filter((u) => u.id !== friendId));

      setSelectedUser(null);
      setSelectedUserProfil(null);
      setopen(false);
      toast.success("Ami supprimé");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleclose = () => {
    setopen(false);
  };

  return (
    <div className="headerFriends">
      <div className="headerFriendsLeft">
        <p id="title">Mes ami(e)s</p>
        <div className="filterFriendsAccept">
          <input
            type="search"
            value={texteSearch}
            name="texteSearch"
            onChange={handleChangeFilter}
            placeholder="saisir le nom de votre ami(e)s"
          />
        </div>
        <div className="FriendsMain">
          {loading ? (
            <p className="text-center">Chargement...</p>
          ) : friends.length > 0 ? (
            friends.map((p) => (
              <div
                className={`FriendsMainItems ${selectedUser === p.id ? "active" : ""}`}
                key={p.id}
                onClick={() => {
                  setSelectedUser(p.id);
                  handleSelect(p);
                }}
              >
                <img src={p.photo} alt={p.name} />
                <p>{p.name}</p>
              </div>
            ))
          ) : (
            <p className="text-center">Aucun ami trouvé 🥲</p>
          )}
        </div>
      </div>
      <div className="headerFriendsRight">
        {selectedUser && selectedUserProfil && (
          <div className="headerFriendsRightDescription">
            <div className="UserDescribe">
              <div className="UserDescribeLeft">
                <img
                  src={selectedUserProfil.photo}
                  alt={selectedUserProfil.name}
                />
                <p>{selectedUserProfil.name}</p>
                <div className="UserDescribeSendSms">
                  <img
                    src={img2}
                    alt="Envoyer un message"
                    onClick={() => handlesendsms(selectedUserProfil.id)}
                  />
                  <span>Envoyer un message</span>
                </div>
              </div>
              <div className="UserDescribeRight">
                <img
                  src={opendescribe ? img4 : img3}
                  alt="déplier/replier"
                  onClick={() => setopendescribe(!opendescribe)}
                />
              </div>
            </div>
            {opendescribe && (
              <div className="UserDescribeVisible">
                <p>
                  Vous êtes ami(e)s avec {selectedUserProfil.name} depuis :
                  {friendshipDate
                    ? new Date(
                        `${friendshipDate.year}-${friendshipDate.month}-${friendshipDate.day}`,
                      ).toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "chargement..."}
                </p>
                <p
                  onClick={() => setopen(true)}
                  style={{ cursor: "pointer", color: "red" }}
                >
                  Supprimer {selectedUserProfil.name} de votre liste d'ami(e)s
                </p>
              </div>
            )}
          </div>
        )}
        <div className="headerFriendsRightSearch">
          {/* AFFICHAGE DES DEMANDES REÇUES */}
          {usering.length > 0 && (
            <div>
              <p className="text-center">
                Demandes d'amitié en attente de validation
              </p>
              <div className="HeaderFriendsWaitings">
                {usering.map((p) => (
                  <div className="HeaderFriendsWaiting" key={p.requestId}>
                    <div className="WaitingAccept">
                      <img src={p.photo} alt={p.name} />
                      <p>{p.name}</p>
                    </div>
                    <div className="WaitingAcceptButton">
                      <Button
                        className="accept"
                        onClick={() =>
                          respondRequest(p.requestId!, "accepter", p)
                        }
                      >
                        Accepter
                      </Button>
                      <Button
                        className="decline"
                        onClick={() =>
                          respondRequest(p.requestId!, "refuser", p)
                        }
                      >
                        Refuser
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="headerFriendsSend">
            <p className="text-center font-bold">
              Allons y à la recherche des ami(e)s
            </p>
            <input
              type="search"
              value={textsearching}
              name="texteSearchAll"
              onChange={handleChangeFiltering}
              placeholder="saisir le nom d'une personne"
            />
            <div className="UserList">
              {loading ? (
                <p className="text-center">Chargement des utilisateurs...</p>
              ) : filteredDisplayUsers.length === 0 ? (
                <p className="text-center">Aucun utilisateur trouvé</p>
              ) : null}

              {filteredDisplayUsers.map((p) => (
                <div className="FriendsMainItem" key={p.id}>
                  <img src={p.photo} alt={p.name} />
                  <p>{p.name}</p>
                  <div className="StatutsUser">
                    {p.isFriend && (
                      <Button className="accept" disabled>
                        Vous êtes ami(e)s
                      </Button>
                    )}
                    {!p.isFriend && p.hasSentRequest && (
                      <div className="">
                        <p className="text-center p-2">Demande envoyée</p>
                        <div className="AmityReceive">
                          <Button className="retour" disabled>
                            En attente de validation...
                          </Button>
                          <Button
                            className="decline"
                            onClick={() => handlecancel(p)}
                          >
                            Annuler la demande
                          </Button>
                        </div>
                      </div>
                    )}
                    {!p.isFriend && p.hasReceivedRequest && (
                      <p style={{ textAlign: "center", fontStyle: "italic" }}>
                        Vous avez reçu une demande
                      </p>
                    )}
                    {!p.isFriend &&
                      !p.hasSentRequest &&
                      !p.hasReceivedRequest && (
                        <Button
                          className="retour"
                          onClick={() => sendFriendRequest(p)}
                        >
                          Envoyer une demande d'amitié
                        </Button>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dialog de suppression */}
      {selectedUserProfil && open && (
        <Dialog open={open} onClose={handleclose} className="customdialog">
          <DialogContent>
            <DialogContentText className="dialogtext">
              <p className="text-center">
                Voulez-vous vraiment supprimer votre ami(e) ?
              </p>
            </DialogContentText>
          </DialogContent>
          <DialogContent>
            <DialogContentText className="dialogtext">
              <img
                src={selectedUserProfil.photo}
                alt={selectedUserProfil.name}
              />
              <p className="text-center">{selectedUserProfil.name}</p>
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <div className="flex justify-center gap-10 w-full">
              <Button onClick={handleclose} className="retour">
                Retour
              </Button>
              <Button
                className="decline"
                onClick={() => handledrop(selectedUserProfil.id)}
              >
                Confirmer
              </Button>
            </div>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
};

export default Ami;
