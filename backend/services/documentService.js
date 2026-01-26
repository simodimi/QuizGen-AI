const { Document, Section } = require("../models");
const fs = require("fs");
const path = require("path");

const createDocument = async (userId, fileData, sections = []) => {
  const document = await Document.create({
    fileName: fileData.originalname,
    mimeType: fileData.mimetype,
    size: fileData.size,
    path: fileData.path,
    userId: userId,
    textPreview: fileData.textPreview || null,
    sectionCount: sections.length,
  });
  // Créer les sections
  const sectionPromises = sections.map((section, index) =>
    Section.create({
      documentId: document.id,
      title: section.title || `Section ${index + 1}`,
      content: section.content,
      order: section.order || index + 1,
      wordCount: section.content.split(/\s+/).length,
    }),
  );
  //attendre que toutes les sections soient créées simultanément
  await Promise.all(sectionPromises);
  return document;
};

const deleteDocument = async (documentId, userId) => {
  //rechercher le document et s'assurer qu'il appartient au propriétaire userId
  const document = await Document.findOne({
    where: { id: documentId, userId },
  });
  if (!document) {
    throw new Error("Document non trouvé ou accès refusé");
  }
  // Supprimer le fichier physique
  //existsSync permet de savoir si le fichier existe
  if (document.path && fs.existsSync(document.path)) {
    //unlinkSync supprime le fichier physique du disque
    fs.unlinkSync(document.path);
  }
  // Supprimer les sections liées au document
  await Section.destroy({ where: { documentId } });
  // Supprimer le document
  await document.destroy();
  return true;
};

const getUserDocuments = async (userId, options = {}) => {
  const { page = 1, limit = 20, search = "" } = options;
  const offset = (page - 1) * limit; //combien de document à sauter avant de commmencer la page
  const where = { userId }; //condition de recherche sur l'id de l'utilisateur
  if (search) {
    //la recherche par filName ressemble à %search%
    //Op.like:ressemble à
    where.fileName = { [require("sequelize").Op.like]: `%${search}%` };
  }
  const { count, rows } = await Document.findAndCountAll({
    where,
    include: [
      {
        model: require("../models").Quiz,
        as: "quizzes",
        attributes: ["id", "title", "createdAt"], //récupère les attributs id, title et createdAt de la table Quiz
      },
    ],
    order: [["createdAt", "DESC"]],
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
  return {
    documents: rows, //tableau de documents de la page courante
    total: count, //nombre total de documents correspondant à la recherche et à l’utilisateur
    page: parseInt(page), //numéro de la page actuelle
    totalPages: Math.ceil(count / limit),
  };
};
module.exports = {
  createDocument,
  deleteDocument,
  getUserDocuments,
};
