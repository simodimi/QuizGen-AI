const { PDFParse } = require("pdf-parse");
const mammoth = require("mammoth");
const fs = require("fs").promises;

const extractTextFromFile = async (filePath, mimeType) => {
  try {
    console.log(`Extraction depuis: ${filePath}, type: ${mimeType}`);

    if (mimeType === "application/pdf") {
      const buffer = await fs.readFile(filePath);
      console.log(`Taille du PDF: ${buffer.length} bytes`);

      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      await parser.destroy();

      let text = result.text
        .replace(/[\u00A0\u202F]/g, " ")
        .replace(/[\r\n]+/g, "\n")
        .replace(/\s+/g, " ")
        .trim();

      console.log(`Texte extrait: ${text.length} caractères`);

      if (text.length < 50) {
        console.warn("ATTENTION: Texte très court extrait");
        return text;
      }

      return text;
    }

    // Pour les fichiers Word (.docx)
    if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({ path: filePath });
      let text = result.value
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2026]/g, "...")
        .replace(/[\u2013\u2014]/g, "-")
        .replace(/\s+/g, " ")
        .trim();
      return text;
    }

    // Pour les fichiers texte (.txt)
    if (mimeType === "text/plain") {
      const content = await fs.readFile(filePath, "utf-8");
      let text = content
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2026]/g, "...")
        .replace(/[\u2013\u2014]/g, "-")
        .replace(/\s+/g, " ")
        .trim();
      return text;
    }

    throw new Error(`Type de fichier non supporté: ${mimeType}`);
  } catch (error) {
    console.error("Erreur extraction texte:", error);

    // Essayer une extraction de secours pour PDF seulement
    if (mimeType === "application/pdf") {
      try {
        console.log("Tentative d'extraction de secours...");
        const buffer = await fs.readFile(filePath);
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        await parser.destroy();
        return result.text
          .replace(/\s+/g, " ")
          .replace(/[^\x00-\x7F]/g, " ")
          .trim();
      } catch (fallbackError) {
        console.error("Échec extraction de secours:", fallbackError);
      }
    }
    throw error;
  }
};

const detectSectionsIntelligent = (textContent, maxWordsPerSection = 1000) => {
  if (!textContent || textContent.trim().length === 0) {
    return [{ title: "Document entier", content: textContent, order: 1 }];
  }

  const lines = textContent
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const sections = [];
  let currentSection = [];
  let currentTitle = null;

  const sectionPatterns = [
    /^(PROFIL|PROFILE|À PROPOS|ABOUT)/i,
    /^(EXPÉRIENCES|EXPERIENCES|EXPÉRIENCE PROFESSIONNELLE)/i,
    /^(FORMATION|EDUCATION)/i,
    /^(COMPÉTENCES|SKILLS|COMPETENCES)/i,
    /^(PROJETS|PROJECTS|RÉALISATIONS)/i,
    /^(LANGUES|LANGUAGES)/i,
    /^(CENTRES D'INTÉRÊT|INTERESTS|HOBBIES)/i,
    /^(CERTIFICATIONS|CERTIFICATS)/i,
    /^(SOMMAIRE|TABLE DES MATIÈRES|CONTENTS)/i,
    /^(INTRODUCTION)/i,
    /^(CONCLUSION)/i,
    /^(RÉFÉRENCES|BIBLIOGRAPHIE)/i,
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let isSectionTitle = false;

    for (const pattern of sectionPatterns) {
      if (pattern.test(line)) {
        isSectionTitle = true;
        break;
      }
    }

    if (!isSectionTitle) {
      isSectionTitle =
        (line.length < 100 && (line.endsWith(":") || line.endsWith("."))) ||
        /^[A-ZÀ-ÖØ-Þ\s\d-]{3,50}$/.test(line) ||
        /^[IVXLCDM]+\.\s+[A-Z]/.test(line) ||
        /^\d+\.\s+[A-Z]/.test(line);
    }

    if (isSectionTitle) {
      if (currentSection.length > 0) {
        sections.push({
          title: currentTitle || `Section ${sections.length + 1}`,
          content: currentSection.join("\n"),
          order: sections.length + 1,
          wordCount: currentSection.join(" ").split(/\s+/).length,
        });
      }

      currentTitle = line;
      currentSection = [];
    } else {
      currentSection.push(line);
    }
  }

  if (currentSection.length > 0) {
    sections.push({
      title: currentTitle || `Section ${sections.length + 1}`,
      content: currentSection.join("\n"),
      order: sections.length + 1,
      wordCount: currentSection.join(" ").split(/\s+/).length,
    });
  }

  if (sections.length === 0) {
    const paragraphs = textContent
      .split(/\n\s*\n/)
      .filter((p) => p.trim().length > 0);
    let currentContent = [];
    let currentWordCount = 0;

    for (const paragraph of paragraphs) {
      const wordCount = paragraph.split(/\s+/).length;

      if (
        currentWordCount + wordCount > maxWordsPerSection &&
        currentContent.length > 0
      ) {
        sections.push({
          title: `Partie ${sections.length + 1}`,
          content: currentContent.join("\n\n"),
          order: sections.length + 1,
          wordCount: currentWordCount,
        });
        currentContent = [paragraph];
        currentWordCount = wordCount;
      } else {
        currentContent.push(paragraph);
        currentWordCount += wordCount;
      }
    }

    if (currentContent.length > 0) {
      sections.push({
        title: `Partie ${sections.length + 1}`,
        content: currentContent.join("\n\n"),
        order: sections.length + 1,
        wordCount: currentWordCount,
      });
    }
  }

  console.log(`Document découpé en ${sections.length} sections intelligentes`);
  return sections;
};

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
  detectSections: detectSectionsIntelligent,
  detectSectionsSimple,
};
