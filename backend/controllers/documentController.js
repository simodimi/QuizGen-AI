const {
  Document,
  Section,
  Quiz,
  User,
  SharedDocument,
} = require("../models/Association");
const {
  extractTextFromFile,
  detectSections,
} = require("../services/sectionService");
const fs = require("fs");
const path = require("path");

const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Aucun fichier uploadé" });
    }

    const { originalname, mimetype, size, path: filePath } = req.file;
    const userId = req.user.id;

    const allowedMimeTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-powerpoint",
      "text/plain",
      "image/jpeg",
      "image/png",
      "image/tiff",
    ];

    if (!allowedMimeTypes.includes(mimetype)) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        message: "Type de fichier non supporté",
        supportedTypes: ["PDF", "DOCX", "TXT"],
      });
    }

    // ✅ Étape 1: Créer le document IMMÉDIATEMENT avec un statut "processing"
    const document = await Document.create({
      userId,
      fileName: originalname,
      mimeType: mimetype,
      size: size,
      path: filePath,
      textPreview: "Traitement en cours...",
      sectionCount: 0,
      status: "processing", // Vous devez ajouter ce champ à votre modèle Document
    });

    // ✅ Étape 2: RÉPONDRE IMMÉDIATEMENT au frontend
    res.status(201).json({
      message: "Document uploadé, traitement en cours",
      document: {
        id: document.id,
        fileName: document.fileName,
        createdAt: document.createdAt,
        status: "processing",
        size: document.size,
        mimeType: document.mimeType,
      },
    });

    // ✅ Étape 3: Lancer le traitement en ARRIÈRE-PLAN (sans await)
    (async () => {
      try {
        console.log(
          `🔄 Traitement en arrière-plan du document ${document.id}...`,
        );

        // Extraction texte
        let textContent;
        try {
          textContent = await extractTextFromFile(filePath, mimetype);
        } catch (extractError) {
          console.error(
            `❌ Erreur extraction document ${document.id}:`,
            extractError,
          );
          await document.update({
            status: "error",
            textPreview: "Erreur d'extraction",
          });
          return;
        }

        if (!textContent || textContent.trim().length === 0) {
          console.error(`❌ Document ${document.id} sans texte lisible`);
          await document.update({
            status: "error",
            textPreview: "Aucun texte lisible",
          });
          return;
        }

        // Découpage en sections
        const sections = detectSections(textContent, 1500);

        // Mise à jour du document
        await document.update({
          textPreview: textContent.substring(0, 500) + "...",
          sectionCount: sections.length,
        });

        // Création des sections
        const sectionPromises = sections.map((section, index) => {
          return Section.create({
            documentId: document.id,
            title: section.title || `Section ${index + 1}`,
            content: section.content,
            order: section.order || index + 1,
            wordCount: section.content.split(/\s+/).length,
          });
        });
        await Promise.all(sectionPromises);

        // Indexation Qdrant
        try {
          const VectorService = require("../services/vectorService");
          await VectorService.indexDocument(document.id, textContent, {
            userId: document.userId,
            fileName: document.fileName,
          });
          console.log(`📤 Document ${document.id} indexé dans Qdrant`);

          // ✅ Mettre à jour le statut
          await document.update({ status: "ready" });

          console.log("========== VÉRIFICATION SOCKET ==========");
          console.log("🔍 global.io existe ?", global.io ? "OUI ✅" : "NON ❌");
          console.log("🔍 userId:", userId);
          console.log("🔍 document.id:", document.id);
          console.log("🔍 room:", `user_${userId}`);

          if (global.io) {
            console.log("📢 Tentative d'émission de document:indexed");

            const result = global.io
              .to(`user_${userId}`)
              .emit("document:indexed", {
                documentId: document.id,
                sectionCount: sections.length,
                status: "ready",
              });

            console.log(
              "✅ Émission envoyée, résultat:",
              result ? "OK" : "Échec",
            );
          } else {
            console.log("❌ ERREUR CRITIQUE: global.io est undefined !");
          }
        } catch (qdrantError) {
          console.error(
            `⚠️ Erreur indexation Qdrant ${document.id}:`,
            qdrantError.message,
          );
          await document.update({ status: "ready_no_vector" }); // Prêt mais sans vectorisation
        }

        console.log(
          `✅ Document ${document.id} traité avec succès (${sections.length} sections)`,
        );
      } catch (error) {
        console.error(`❌ Erreur traitement document ${document.id}:`, error);
        try {
          await document.update({ status: "error" });
        } catch (updateError) {
          console.error("Erreur mise à jour statut:", updateError);
        }
      }
    })(); // ← Exécution immédiate sans await
  } catch (error) {
    console.error("❌ Erreur upload document:", error);

    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      message: "Erreur lors de l'upload du document",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const getMyDocuments = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, search = "" } = req.query;
    const offset = (page - 1) * limit;

    // 1. Récupérer les documents possédés par l'utilisateur
    const ownedWhere = { userId };
    if (search) {
      ownedWhere.fileName = { [require("sequelize").Op.like]: `%${search}%` };
    }

    const ownedDocs = await Document.findAndCountAll({
      where: ownedWhere,
      include: [
        {
          model: Quiz,
          as: "quizzes",
          attributes: ["id", "title", "createdAt"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // 2. Récupérer les documents partagés avec l'utilisateur
    const sharedDocs = await Document.findAll({
      include: [
        {
          model: User,
          as: "sharedWith",
          where: { id: userId },
          through: {
            model: SharedDocument,
            attributes: ["sharedAt", "sharedViaQuizId"],
          },
          required: true, // INNER JOIN - seulement les documents partagés avec cet utilisateur
        },
        {
          model: User,
          as: "owner",
          attributes: ["id", "userName", "userPhoto"],
        },
        {
          model: Quiz,
          as: "quizzes",
          attributes: ["id", "title", "createdAt"],
        },
      ],
      where: search
        ? {
            fileName: { [require("sequelize").Op.like]: `%${search}%` },
          }
        : {},
      order: [["createdAt", "DESC"]],
    });

    // 3. Formater les documents possédés
    const formattedOwned = ownedDocs.rows.map((doc) => ({
      id: doc.id,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      size: doc.size,
      createdAt: doc.createdAt,
      sectionCount: doc.sectionCount,
      textPreview: doc.textPreview,
      quizCount: doc.quizzes ? doc.quizzes.length : 0,
      quizzes: doc.quizzes || [],
      shared: doc.shared,
      isShared: false,
      ownership: "owner",
    }));

    // 4. Formater les documents partagés
    const formattedShared = sharedDocs.map((doc) => ({
      id: doc.id,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      size: doc.size,
      createdAt: doc.createdAt,
      sectionCount: doc.sectionCount,
      textPreview: doc.textPreview,
      quizCount: doc.quizzes ? doc.quizzes.length : 0,
      quizzes: doc.quizzes || [],
      shared: true,
      isShared: true,
      ownership: "shared",
      sharedBy: {
        id: doc.owner?.id,
        userName: doc.owner?.userName,
        userPhoto: doc.owner?.userPhoto,
      },
      sharedAt: doc.sharedWith?.[0]?.sharedDocument?.sharedAt,
      sharedViaQuizId: doc.sharedWith?.[0]?.sharedDocument?.sharedViaQuizId,
    }));

    // 5. Fusionner et trier par date
    const allDocuments = [...formattedOwned, ...formattedShared];
    allDocuments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 6. Appliquer la pagination sur le résultat fusionné
    const total = allDocuments.length;
    const paginatedDocs = allDocuments.slice(offset, offset + parseInt(limit));

    res.json({
      documents: paginatedDocs,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      summary: {
        owned: formattedOwned.length,
        shared: formattedShared.length,
      },
    });
  } catch (error) {
    console.error("Erreur récupération documents:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

const getSharedWithMe = async (req, res) => {
  try {
    // Pour l'instant, retourner vide car pas implémenté
    res.json([]);
  } catch (error) {
    console.error("Erreur récupération documents partagés:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Vérifier si c'est un document partagé
    const sharedDoc = await SharedDocument.findOne({
      where: { documentId: id, sharedWithId: userId },
    });

    if (sharedDoc) {
      // C'est un document partagé → supprimer juste le lien
      await sharedDoc.destroy();
      return res.json({
        success: true,
        message: "Document retiré de votre liste",
        wasShared: true,
      });
    }
    const document = await Document.findOne({
      where: { id, userId },
    });

    if (!document) {
      return res
        .status(404)
        .json({ message: "Document non trouvé ou accès refusé" });
    }
    try {
      const VectorService = require("../services/vectorService");
      await VectorService.deleteDocument(id);
    } catch (qdrantError) {
      console.error("⚠️ Erreur suppression Qdrant:", qdrantError.message);
    }

    // Supprimer fichier physique
    if (document.path && fs.existsSync(document.path)) {
      fs.unlinkSync(document.path);
    }

    // Supprimer sections
    await Section.destroy({ where: { documentId: id } });

    // Supprimer document
    await document.destroy();

    res.json({
      success: true,
      message: "Document supprimé avec succès",
    });
  } catch (error) {
    console.error("Erreur suppression document:", error);
    res.status(500).json({ message: "Erreur lors de la suppression" });
  }
};

const shareDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { userIds } = req.body;
    const ownerId = req.user.id;

    const document = await Document.findOne({
      where: { id, userId: ownerId },
    });

    if (!document) {
      return res
        .status(404)
        .json({ message: "Document non trouvé ou accès refusé" });
    }

    // Marquer comme partagé
    document.shared = true;
    await document.save();

    // Note: Implémenter la logique de partage ici
    res.json({
      success: true,
      message: "Document partagé avec succès",
      documentId: id,
      sharedWith: userIds,
    });
  } catch (error) {
    console.error("Erreur partage document:", error);
    res.status(500).json({ message: "Erreur lors du partage" });
  }
};

const getDocumentDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const document = await Document.findOne({
      where: { id, userId },
      include: [
        {
          model: Section,
          as: "sections",
          order: [["order", "ASC"]],
        },
        {
          model: Quiz,
          as: "quizzes",
          attributes: ["id", "title", "createdAt", "status", "questionCount"],
          order: [["createdAt", "DESC"]],
        },
      ],
    });

    if (!document) {
      return res.status(404).json({ message: "Document non trouvé" });
    }

    res.json(document);
  } catch (error) {
    console.error("Erreur récupération détails:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const document = await Document.findOne({
      where: { id, userId },
    });

    if (!document) {
      return res
        .status(404)
        .json({ message: "Document non trouvé ou accès refusé" });
    }

    if (!document.path || !fs.existsSync(document.path)) {
      return res.status(404).json({ message: "Fichier introuvable" });
    }

    res.download(document.path, document.fileName);
  } catch (error) {
    console.error("Erreur téléchargement document:", error);
    res.status(500).json({ message: "Erreur lors du téléchargement" });
  }
};
module.exports = {
  uploadDocument,
  getMyDocuments,
  getSharedWithMe,
  deleteDocument,
  shareDocument,
  getDocumentDetails,
  downloadDocument,
};
