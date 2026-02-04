import React, { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import a1 from "../assets/avatar/A1.jpg";
import img1 from "../assets/icone/un.png";
import img2 from "../assets/icone/deux.png";
import img3 from "../assets/icone/trois.png";
import img4 from "../assets/icone/oth.png";
import "../style/doc.css";
const Result = () => {
  const [avatar, setavatar] = useState<string>(a1);
  const [open, setopen] = useState<boolean>(false);
  const [message, setmessage] = useState<string>("Hello dimitri,vos resultats");
  const handleclose = () => {
    setopen(false);
  };
  return (
    <div className="QuizHeader">
      <div className="QuizHeaderBtn">
        <div className="QuizWord">
          {avatar && <img src={avatar} alt="" />}
          <h1>{message}</h1>
        </div>
      </div>
      <div className="OptionsDocs">
        <div className="Optionsfile">
          <p>
            {new Date()
              .toLocaleDateString("fr-FR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })
              .padStart(2, "0")}
          </p>
          <span className="resultTheme">Quiz classique thème histoire</span>
          <span>Dimitri : 10/10 points (100%) 12h15minutes</span>
          <span className="resultTheme">Quiz classique thème histoire</span>
          <span>Dimitri : 10/10 points (100%) 12h15minutes</span>
        </div>
        <div className="Optionsfile">
          <div className="dateresult">
            <div className="resulticon">
              <img src={img4} alt="" />
              <span>
                28<sup>e</sup>
              </span>
            </div>
            <p>
              {new Date()
                .toLocaleDateString("fr-FR", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
                .padStart(2, "0")}
            </p>
          </div>
          <span>Quiz IA nom du document</span>
          <div className="scoreResult">
            <div className="classementResult">
              <span className="numberResult">1er</span>
              <span className="textResult">Dimitri : 10/10 points (100%)</span>
            </div>

            <div className="classementResult">
              <span className="numberResult">2e</span>
              <span className="textResult">Yannick : 10/10 points (100%)</span>
            </div>

            <div className="classementResult">
              <span className="numberResult">3e</span>
              <span className="textResult">
                DimitriDimitrix12454565 : 10/10 points (100%)
              </span>
            </div>

            <div className="classementResult">
              <span className="numberResult">4e</span>
              <span className="textResult">Yannick : 10/10 points (100%)</span>
            </div>
          </div>
        </div>
      </div>
      {open && (
        <Dialog open={open} onClose={handleclose} className="customdialog">
          <DialogContent>
            <DialogContentText
              style={{ textAlign: "center", marginBottom: "20px" }}
            >
              <iframe src=""></iframe>
            </DialogContentText>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Result;
