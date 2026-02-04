const { Document, Section, Quiz } = require("../models/Association");
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
      "text/plain",
    ];

    if (!allowedMimeTypes.includes(mimetype)) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        message: "Type de fichier non supporté",
        supportedTypes: ["PDF", "DOCX", "TXT"],
      });
    }

    // Extraction texte
    let textContent;
    try {
      textContent = await extractTextFromFile(filePath, mimetype);
    } catch (extractError) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        message: "Impossible d'extraire le texte du fichier",
        error:
          process.env.NODE_ENV === "development"
            ? extractError.message
            : undefined,
      });
    }

    if (!textContent || textContent.trim().length === 0) {
      fs.unlinkSync(filePath);
      return res
        .status(400)
        .json({ message: "Le document ne contient pas de texte lisible" });
    }

    // Découpage en sections
    const sections = detectSections(textContent, 1500);

    // Création document
    const document = await Document.create({
      userId,
      fileName: originalname,
      mimeType: mimetype,
      size: size,
      path: filePath,
      textPreview: textContent.substring(0, 500) + "...",
      sectionCount: sections.length,
    });

    // Création sections
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

    res.status(201).json({
      message: "Document uploadé avec succès",
      document: {
        id: document.id,
        fileName: document.fileName,
        sectionCount: sections.length,
        createdAt: document.createdAt,
        textPreview: document.textPreview,
        size: document.size,
        mimeType: document.mimeType,
      },
    });
  } catch (error) {
    console.error("Erreur upload document:", error);

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

    const where = { userId };

    if (search) {
      where.fileName = { [require("sequelize").Op.like]: `%${search}%` };
    }

    const { count, rows } = await Document.findAndCountAll({
      where,
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

    const documents = rows.map((doc) => ({
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
    }));

    res.json({
      documents,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
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

    const document = await Document.findOne({
      where: { id, userId },
    });

    if (!document) {
      return res
        .status(404)
        .json({ message: "Document non trouvé ou accès refusé" });
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

module.exports = {
  uploadDocument,
  getMyDocuments,
  getSharedWithMe,
  deleteDocument,
  shareDocument,
  getDocumentDetails,
};
