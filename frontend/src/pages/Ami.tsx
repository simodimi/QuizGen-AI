import {
  useEffect,
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Friends } from "../store/Frontbdd";
import img1 from "../assets/icone/ami.png";
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

interface AmiProps {
  setcountFriends: Dispatch<SetStateAction<number>>;
  setusersend: Dispatch<SetStateAction<number | null>>;
}
const Ami = ({ setusersend }: AmiProps) => {
  const [open, setopen] = useState<boolean>(false);
  const [opendescribe, setopendescribe] = useState<boolean>(false);
  const [filterfriends, setfilterfriends] = useState<Friends[]>(Friends);
  const [friendsAll, setfriendsAll] = useState<Friends[]>(Friends);
  const [texteSearch, settexteSearch] = useState<string>("");
  const [texteSearchAll, settexteSearchAll] = useState<string>("");
  const [requestId, setrequestId] = useState<number[]>([]);
  const [requestreceiveId, setrequestreceiveId] = useState<Friends[]>([]);
  const [requestacceptId, setrequestacceptId] = useState<Friends[]>([]);
  const [friends, setfriends] = useState<Friends[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedUserProfil, setSelectedUserProfil] = useState<Friends | null>(
    null,
  );
  const navigate = useNavigate();

  const handleclose = () => {
    setopen(false);
  };
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const dimi = e.target.value;
    settexteSearch(dimi);
    const filter = dimi
      ? requestacceptId.filter((item) =>
          item.name.toLowerCase().includes(dimi.toLocaleLowerCase()),
        )
      : requestacceptId;
    setfriends(filter);
  };
  const handleChangeAll = (e: ChangeEvent<HTMLInputElement>) => {
    const dimi = e.target.value;
    settexteSearchAll(dimi);
    setfriendsAll(
      dimi
        ? filterfriends.filter((item) =>
            item.name.toLowerCase().includes(dimi.toLocaleLowerCase()),
          )
        : filterfriends,
    );
  };
  ///envoie de demande
  const sendrequest = (p: Friends) => {
    setrequestId((prev) => (prev.includes(p.id) ? prev : [...prev, p.id]));
    setrequestreceiveId((prev) =>
      prev.find((item) => item.id === p.id) ? prev : [...prev, p],
    );
  };
  //refuser demande
  const handlecancel = (p: Friends) => {
    setrequestreceiveId((prev) => prev.filter((item) => item.id !== p.id));
    setrequestId((prev) => prev.filter((item) => item !== p.id));
  };
  //annuler demande
  const handledecline = (p: Friends) => {
    setrequestreceiveId((prev) => prev.filter((item) => item.id !== p.id));
    setrequestId((prev) => prev.filter((item) => item !== p.id));
  };
  //accepter demande
  const handleaccept = (p: Friends) => {
    setrequestacceptId((prev) => {
      const newlist = prev.find((item) => item.id === p.id)
        ? prev
        : [...prev, p];
      setfriends(newlist); // mettre à jour friends
      return newlist;
    });
    setrequestreceiveId((prev) => prev.filter((item) => item.id !== p.id));
  };
  const handleSelect = (p: Friends) => {
    setSelectedUserProfil(p);
    setopendescribe(false);
  };
  const handledrop = (p: Friends) => {
    handleclose();
    setfriends((prev) => prev.filter((item) => item.id !== p.id));
    setSelectedUser(null);
    setrequestacceptId((prev) => prev.filter((item) => item.id !== p.id));
    setrequestreceiveId((prev) => prev.filter((item) => item.id !== p.id));
    setrequestId((prev) => prev.filter((item) => item !== p.id));
  };
  const handlesendsms = (id: number) => {
    setusersend(id);
    navigate("/home/message");
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
            onChange={handleChange}
            id=""
            placeholder="saisir le nom de votre ami(e)s"
          />
        </div>
        <div className="FriendsMain">
          {friends.length > 0 ? (
            <>
              {friends.map((p) => (
                <div
                  className={`FriendsMainItems ${selectedUser === p.id ? "active" : ""}`}
                  key={p.id}
                  onClick={() => {
                    (setSelectedUser(p.id), handleSelect(p));
                  }}
                >
                  <img src={p.photo} alt="" />
                  <p>{p.name}</p>
                </div>
              ))}
            </>
          ) : (
            <p className="text-center">Aucun ami trouvé 🥲</p>
          )}
        </div>
      </div>
      <div className="headerFriendsRight">
        {selectedUser && (
          <div className="headerFriendsRightDescription">
            <div className="UserDescribe">
              <div className="UserDescribeLeft">
                <img src={selectedUserProfil?.photo} alt="" />
                <p>{selectedUserProfil?.name}</p>
                <div className="UserDescribeSendSms">
                  <img
                    src={img2}
                    alt=""
                    onClick={() => {
                      if (selectedUserProfil) {
                        handlesendsms(selectedUserProfil?.id);
                      }
                    }}
                  />
                  <span>Envoyer un sms</span>
                </div>
              </div>
              <div className="UserDescribeRight">
                <img
                  src={opendescribe ? img4 : img3}
                  alt=""
                  onClick={() => setopendescribe(!opendescribe)}
                />
              </div>
            </div>
            {opendescribe && (
              <div className="UserDescribeVisible">
                <p>
                  Vous êtes ami(e)s avec {selectedUserProfil?.name} depuis le{" "}
                  {new Date().toLocaleDateString()}.
                </p>
                <p>
                  Derniers échanges :&nbsp;
                  {new Date().toLocaleDateString("fr-FR", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  à {new Date().toLocaleTimeString("fr-FR").padStart(2, "0")}.
                </p>
                <p onClick={() => setopen(true)}>
                  Supprimer {selectedUserProfil?.name} de votre liste d'ami(e)s.
                </p>
              </div>
            )}
          </div>
        )}
        <div className="headerFriendsRightSearch">
          {requestreceiveId.length > 0 && (
            <p className="text-center">
              Demandes d'amitié en attente de validation
            </p>
          )}
          <div className="HeaderFriendsWaitings">
            {requestreceiveId.map((p) => (
              <div className="HeaderFriendsWaiting">
                <div className="WaitingAccept">
                  <img src={p.photo} alt="" />
                  <p>{p.name}</p>
                </div>
                <div className="WaitingAcceptButton">
                  <Button className="accept" onClick={() => handleaccept(p)}>
                    Accepter
                  </Button>
                  <Button className="decline" onClick={() => handlecancel(p)}>
                    Refuser
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="headerFriendsSend">
            <p className="text-center font-bold">
              Allons y à la recherche des ami(e)s
            </p>
            <input
              type="search"
              value={texteSearchAll}
              name="texteSearchAll"
              onChange={handleChangeAll}
              id=""
              placeholder="saisir le nom d'une personne"
            />
            <div className="UserList">
              {friendsAll.length > 0 ? (
                <>
                  {friendsAll.map((p) => (
                    <div className="FriendsMainItem" key={p.id}>
                      <img src={p.photo} alt="" />
                      <p>{p.name}</p>
                      <div className="StatutsUser">
                        {!requestId.includes(p.id) && (
                          <>
                            <Button
                              className="retour"
                              onClick={() => sendrequest(p)}
                            >
                              Envoyer une demande d'amitié
                            </Button>
                          </>
                        )}
                        {requestId.includes(p.id) &&
                          !requestacceptId.includes(p) && (
                            <>
                              <div className="AmityReceive">
                                <Button className="retour">
                                  En attente de validation...
                                </Button>
                                <>
                                  <Button
                                    className="decline"
                                    onClick={() => handledecline(p)}
                                  >
                                    Annuler la demande
                                  </Button>
                                </>
                              </div>
                            </>
                          )}
                        {requestacceptId.includes(p) && (
                          <>
                            <Button className="accept">
                              Vous êtes ami(e)s
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-center">Aucun utilisateur trouvé 🥲</p>
              )}
            </div>
          </div>
        </div>
      </div>
      {selectedUserProfil && open && (
        <Dialog open={open} onClose={handleclose} className="customdialog">
          <DialogContent>
            <DialogContentText className="dialogtext">
              <p className="text-center">
                voulez vous vraiment supprimer votre ami(e)s
              </p>
            </DialogContentText>
          </DialogContent>
          <DialogContent>
            <DialogContentText className="dialogtext">
              <img src={selectedUserProfil?.photo} alt="" />
              <p className="text-center">{selectedUserProfil?.name}</p>
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <div className="flex justify-center gap-10 w-full">
              <Button onClick={handleclose} className="retour">
                Retour
              </Button>
              <Button
                className="decline"
                onClick={() => handledrop(selectedUserProfil)}
              >
                confirmer
              </Button>
            </div>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
};

export default Ami;
