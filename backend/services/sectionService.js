const pdf = require("pdf-parse");
const mammoth = require("mammoth");
const fs = require("fs").promises;

/**
 * Extrait le texte d'un fichier PDF, DOCX ou TXT
 */
const extractTextFromFile = async (filePath, mimeType) => {
  try {
    if (mimeType === "application/pdf") {
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdf(dataBuffer);
      return pdfData.text;
    } else if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } else if (mimeType === "text/plain") {
      return await fs.readFile(filePath, "utf-8");
    } else {
      throw new Error(`Type de fichier non supporté: ${mimeType}`);
    }
  } catch (error) {
    console.error("Erreur extraction texte:", error);
    throw new Error(`Impossible d'extraire le texte: ${error.message}`);
  }
};

/**
 * Détecte les sections dans un texte
 * Découpe par paragraphes, titres, etc.
 */
const detectSections = (textContent, maxWordsPerSection = 1500) => {
  if (!textContent || textContent.trim().length === 0) {
    return [];
  }

  // Normaliser les sauts de ligne
  const normalizedText = textContent
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  // Séparer par doubles sauts de ligne (paragraphes)
  const paragraphs = normalizedText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // Regrouper les paragraphes en sections
  const sections = [];
  let currentSection = [];
  let currentWordCount = 0;

  for (const paragraph of paragraphs) {
    const wordCount = paragraph.split(/\s+/).length;

    // Détecter si c'est un titre (courte phrase, se termine par :, pas de point, majuscules)
    const isLikelyTitle =
      paragraph.length < 100 &&
      (paragraph.endsWith(":") ||
        !paragraph.includes(".") ||
        /^[A-ZÀ-ÿ0-9][^.!?]*$/.test(paragraph));

    if (isLikelyTitle || currentWordCount + wordCount > maxWordsPerSection) {
      // Créer une nouvelle section
      if (currentSection.length > 0) {
        sections.push({
          title:
            currentSection[0]?.split("\n")[0]?.substring(0, 100) ||
            `Section ${sections.length + 1}`,
          content: currentSection.join("\n\n"),
          order: sections.length + 1,
          wordCount: currentWordCount,
        });
      }

      currentSection = [paragraph];
      currentWordCount = wordCount;
    } else {
      currentSection.push(paragraph);
      currentWordCount += wordCount;
    }
  }

  // Ajouter la dernière section
  if (currentSection.length > 0) {
    sections.push({
      title:
        currentSection[0]?.split("\n")[0]?.substring(0, 100) ||
        `Section ${sections.length + 1}`,
      content: currentSection.join("\n\n"),
      order: sections.length + 1,
      wordCount: currentWordCount,
    });
  }

  // Si aucune section n'a été détectée, créer une seule section
  if (sections.length === 0) {
    sections.push({
      title: "Document entier",
      content: textContent,
      order: 1,
      wordCount: textContent.split(/\s+/).length,
    });
  }

  return sections;
};

/**
 * Version simple de détection de sections (fallback)
 */
const detectSectionsSimple = (textContent, maxLength = 2000) => {
  const sections = [];
  const words = textContent.split(/\s+/);

  for (let i = 0; i < words.length; i += maxLength) {
    const chunkWords = words.slice(i, i + maxLength);
    const content = chunkWords.join(" ");
    sections.push({
      title: `Partie ${sections.length + 1}`,
      content,
      order: sections.length + 1,
      wordCount: chunkWords.length,
    });
  }

  return sections;
};

module.exports = {
  extractTextFromFile,
  detectSections,
  detectSectionsSimple,
};
