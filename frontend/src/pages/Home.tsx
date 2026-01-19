import { useRef, useState } from "react";
import vid from "../assets/robots.mp4";
import "../style/home.css";
import { Link } from "react-router-dom";

const Home = () => {
  const [loading, setloading] = useState<boolean>(true);
  const videoref = useRef<HTMLVideoElement | null>(null);

  const handleCanPlay = (): void => {
    if (videoref.current) {
      videoref.current.currentTime = 1;
      videoref.current.play().catch(() => {});
      setloading(false);
    }
  };
  return (
    <div className="HomeHeader">
      <div className="HomeHeaderVideo">
        {loading && (
          <div className="loader">
            <p>Chargement...</p>
          </div>
        )}
        <video
          ref={videoref}
          src={vid}
          autoPlay
          loop //infini
          muted
          playsInline
          onLoadedMetadata={handleCanPlay}
        ></video>
      </div>
      <div className="HomeItems">
        <Link to="/home/quiz/histoire">histoire</Link>
        <Link to="/home/quiz/geographie">géographie</Link>
        <Link to="/home/quiz/capitale">capitale</Link>
        <Link to="/home/quiz/football">football</Link>
        <Link to="/home/quiz/science">science</Link>
        <Link to="/home/quiz/litterature">littérature</Link>
        <Link to="/home/quiz/autoIA">générer un quizz automatiquement</Link>
      </div>
    </div>
  );
};

export default Home;
