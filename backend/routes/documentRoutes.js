const express = require("express");
const router = express.Router();
const {
  uploadDocument,
  getMyDocuments,
  getSharedWithMe,
  deleteDocument,
  shareDocument,
  getDocumentDetails,
  downloadDocument,
} = require("../controllers/documentController");
const { upload, validateFile } = require("../middlewares/uploads");
//envoyer des documents
router.post("/", upload.single("file"), validateFile, uploadDocument);
//récupérer les documents de l'utilisateur
router.get("/", getMyDocuments);
router.get("/shared", getSharedWithMe);
router.delete("/:id", deleteDocument);
router.post("/:id/share", shareDocument);
router.get("/:id", getDocumentDetails);
router.get("/:id/download", downloadDocument);
module.exports = router;
