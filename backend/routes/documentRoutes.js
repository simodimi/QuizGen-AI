const express = require("express");
const router = express.Router();
const {
  uploadDocument,
  getMyDocuments,
  getSharedWithMe,
  deleteDocument,
  shareDocument,
  getDocumentDetails,
} = require("../controllers/documentController");
const { upload, validateFile } = require("../middlewares/uploads");

router.post("/", upload.single("file"), validateFile, uploadDocument);
router.get("/", getMyDocuments);
router.get("/shared", getSharedWithMe);
router.delete("/:id", deleteDocument);
router.post("/:id/share", shareDocument);
router.get("/:id", getDocumentDetails);

module.exports = router;
