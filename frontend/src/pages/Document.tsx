import { useEffect, useState } from "react";
import "../style/doc.css";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import deletes from "../assets/icone/delete.png";
import Button from "../components/ui/Button";
import { useAuth } from "../services/AuthContextUser";
import connect from "../services/Util";
interface DocumentItem {
  id: number;
  fileName: string; // Ajout
  mimeType: string; // Ajout
  createdAt: number;
  path?: string; // Optionnel
  size?: number;
}
const Document = () => {
  const [open, setOpen] = useState<boolean>(false);
  const [storeFile, setStoreFile] = useState<DocumentItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { user } = useAuth();
  const [message] = useState<string>(
    `Hello ${user?.userName}, consultons vos documents`,
  );
  const [avatar, setAvatar] = useState<string>();
  const [objectUrl, setObjectUrl] = useState<string>("");

  const handleClose = () => {
    setOpen(false);
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      setObjectUrl("");
    }
    setSelectedFile(null);
  };

  useEffect(() => {
    if (user) {
      setAvatar(user.userPhoto);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }
    const loadDocuments = async () => {
      try {
        const res = await connect.get("api/documents");
        if (res.data && Array.isArray(res.data.documents)) {
          const docs = res.data.documents.map((doc: any) => ({
            id: doc.id,
            fileName: doc.fileName, // Ajoutez le nom
            mimeType: doc.mimeType, // Ajoutez le type MIME
            createdAt: new Date(doc.createdAt).getTime(),
            path: doc.path, // Si disponible
            size: doc.size,
          }));
          const uniqueDocs: DocumentItem[] = Array.from(
            new Map<string, DocumentItem>(
              docs.map((doc: DocumentItem) => {
                const dayKey = new Date(doc.createdAt)
                  .toISOString()
                  .split("T")[0]; // yyyy-mm-dd

                return [`${doc.fileName}_${dayKey}`, doc];
              }),
            ).values(),
          );

          setStoreFile(uniqueDocs);
        } else {
          console.error("Format de réponse inattendu:", res.data);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des documents:", error);
      }
    };
    loadDocuments();
  }, [user]);

  // Supprimer un fichier
  const handleDelete = async (targetFile: DocumentItem) => {
    try {
      const res = await connect.delete(`api/documents/${targetFile.id}`);
      if (res.status === 200) {
        const filtered = storeFile.filter((f) => f.id !== targetFile.id);
        setStoreFile(filtered);
      } else {
        console.error("Erreur lors de la suppression du document:", res);
      }
    } catch (error) {
      console.error("Erreur lors de la suppression du document:", error);
    }
  };

  // Regroupement par date (yyyy-mm-dd)
  const groupedByDate = storeFile.reduce(
    (acc, item) => {
      const dateKey = new Date(item.createdAt).toISOString().split("T")[0];
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(item);
      return acc;
    },
    {} as Record<string, DocumentItem[]>,
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
  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);
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
              {groupedByDate[date].map((item) => (
                <div className="Optionsfiles" key={item.id}>
                  <span
                    onClick={async () => {
                      try {
                        // Télécharger le fichier quand on clique
                        const response = await connect.get(
                          `api/documents/${item.id}/download`,
                          {
                            responseType: "blob",
                          },
                        );

                        const blob = new Blob([response.data], {
                          type: item.mimeType,
                        });

                        // Création d'un vrai File à partir du Blob
                        const file = new File([blob], item.fileName, {
                          type: item.mimeType,
                        });
                        const url = URL.createObjectURL(file);
                        setObjectUrl(url);
                        setSelectedFile(file);
                        setOpen(true);
                      } catch (error) {
                        console.error(
                          "Erreur lors du chargement du fichier:",
                          error,
                        );
                      }
                    }}
                  >
                    {item.fileName}
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
              <iframe src={objectUrl} title="document" />
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
