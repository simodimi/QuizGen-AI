import "../../style/doc.css";
import img from "../../assets/icone/logo.png";
const Waiting = () => {
  return (
    <div className="headerwait">
      <h1>Hello.</h1>
      <p>Bienvenue le site de sim'schat.</p>
      <p>
        Veuillez consulter votre boîte email et cliquer sur le lien pour activer
        votre compte.
      </p>
      <img src={img} alt="" />
    </div>
  );
};

export default Waiting;
