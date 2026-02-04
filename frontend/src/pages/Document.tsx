import { useEffect, useState } from "react";
import a1 from "../assets/avatar/A1.jpg";
import "../style/doc.css";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import deletes from "../assets/icone/delete.png";
import Button from "../components/ui/Button";

interface DocumentProps {
  passdocument: { file: File; createdAt: number }[];
}

const Document = ({ passdocument }: DocumentProps) => {
  const [avatar] = useState<string>(a1);
  const [open, setOpen] = useState<boolean>(false);
  const [storeFile, setStoreFile] = useState<
    { file: File; createdAt: number }[]
  >([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message] = useState<string>("Hello dimitri, consultons vos documents");

  const handleClose = () => {
    setOpen(false);
    setSelectedFile(null);
  };

  // Synchroniser storeFile avec passdocument
  useEffect(() => {
    setStoreFile(passdocument);
  }, [passdocument]);

  // Supprimer un fichier
  const handleDelete = (targetFile: { file: File; createdAt: number }) => {
    const filtered = storeFile.filter(
      (f) => f.file !== targetFile.file || f.createdAt !== targetFile.createdAt,
    );
    setStoreFile(filtered);
  };

  // Regroupement par date (yyyy-mm-dd)
  const groupedByDate = storeFile.reduce(
    (acc, item) => {
      const dateKey = new Date(item.createdAt).toISOString().split("T")[0];
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(item);
      return acc;
    },
    {} as Record<string, { file: File; createdAt: number }[]>,
  );

  // Tri des dates descendantes
  const sortedDates = Object.keys(groupedByDate).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );
  // Fonction pour formater la date avec weekday
  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };
  return (
    <div className="QuizHeader">
      <div className="QuizHeaderBtn">
        <div className="QuizWord">
          {avatar && <img src={avatar} alt="avatar" />}
          <h1>{message}</h1>
        </div>
      </div>

      <div className="OptionsDoc">
        {storeFile.length > 0 ? (
          sortedDates.map((date) => (
            <div key={date} className="Optionsfile">
              <p> {formatDate(date)}</p>
              {groupedByDate[date].map((item, idx) => (
                <div className="Optionsfiles" key={idx}>
                  <span
                    onClick={() => {
                      setSelectedFile(item.file);
                      setOpen(true);
                    }}
                  >
                    {item.file.name}
                  </span>
                  <img
                    src={deletes}
                    alt="delete"
                    onClick={() => handleDelete(item)}
                  />
                </div>
              ))}
            </div>
          ))
        ) : (
          <p className="text-center font-bold text-[25px]">
            Aucun document disponible 🥲
          </p>
        )}
      </div>

      {/* Dialog pour afficher le fichier */}
      {open && selectedFile && (
        <Dialog open={open} onClose={handleClose} className="opendoc">
          <DialogContent>
            <DialogContentText
              style={{ textAlign: "center", marginBottom: "20px" }}
            >
              <iframe
                src={URL.createObjectURL(selectedFile)}
                style={{ width: "100%", height: "500px" }}
                title="document"
              />
            </DialogContentText>
          </DialogContent>
          <div className="flex justify-center py-2.5">
            <Button className="retour" onClick={handleClose}>
              Fermer
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default Document;
