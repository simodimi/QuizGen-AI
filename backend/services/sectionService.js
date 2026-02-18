const { PDFParse } = require("pdf-parse");
const mammoth = require("mammoth");
const fs = require("fs").promises;
const path = require("path");
const xlsx = require("xlsx");
const pptx2json = require("pptx2json");
const Tesseract = require("tesseract.js"); // Pour l'OCR
const analyzeDocumentStructure = (textContent) => {
  const structure = {
    hasLists: false,
    hasTables: false,
    hasCode: false,
    hasDates: false,
    hasDefinitions: false,
    hasProcedures: false,
    hasNames: false,
    potentialConcepts: [],
    keyPhrases: [],
    sentences: [],
    paragraphs: [],
  };

  // Détection des listes
  const listPatterns = [
    /^[•\-*]\s+/gm,
    /^\d+\.\s+/gm,
    /^[a-z]\)\s+/gm,
    /^[IVXLCDM]+\.\s+/gm,
  ];
  structure.hasLists = listPatterns.some((pattern) =>
    pattern.test(textContent),
  );

  // Détection des tableaux (caractères répétés ou structure tabulaire)
  structure.hasTables = /(\|.*\|)|(\+[-+]+\+)/g.test(textContent);

  // Détection de code
  structure.hasCode =
    /(function|const|let|var|if\s*\(|for\s*\(|while\s*\(|=>|{[\s\S]*})/g.test(
      textContent,
    );

  // Détection de dates
  const datePattern =
    /\b\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}\b|\b\d{4}\b|\b(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}\b/gi;
  const dates = textContent.match(datePattern) || [];
  structure.hasDates = dates.length > 0;

  // Détection de définitions
  const definitionPattern =
    /\b([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[a-zà-ÿ]+){0,3})\s*[:=]|défini(?:t|ssent?)\s+comme|appelé\s+/gi;
  structure.hasDefinitions = definitionPattern.test(textContent);

  // Détection de procédures
  const procedureKeywords =
    /(étapes?|procédure|comment\s+faire|marche\s+à\s+suivre|instructions?|guide)/gi;
  structure.hasProcedures =
    procedureKeywords.test(textContent) || /\d+\.\s+[A-Z]/.test(textContent);

  // Détection de noms propres
  const namePattern =
    /\b[Mm](onsieur|me?|lle?)\s+[A-Z][a-z]+|M\.\s+[A-Z][a-z]+|[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\b/g;
  const names = textContent.match(namePattern) || [];
  structure.hasNames = names.length > 0;

  // Extraction des phrases
  structure.sentences = textContent
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  // Extraction des paragraphes
  structure.paragraphs = textContent
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // Extraction des concepts clés
  const potentialConcepts =
    textContent.match(
      /\*\*([^*]+)\*\*|__([^_]+)__|\b[A-Z]{2,}(?:\s+[A-Z]{2,})*\b/g,
    ) || [];
  structure.potentialConcepts = [
    ...new Set(potentialConcepts.map((c) => c.replace(/[*_]/g, ""))),
  ];

  // Phrases clés (courtes et informatives)
  structure.keyPhrases = structure.sentences
    .filter((s) => s.split(/\s+/).length < 15 && s.length > 10)
    .slice(0, 20);

  console.log(
    `📊 Analyse structure: Listes=${structure.hasLists}, Dates=${structure.hasDates}, Définitions=${structure.hasDefinitions}`,
  );

  return structure;
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
const extractFromExcel = async (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    let textContent = "";

    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const sheetText = xlsx.utils.sheet_to_csv(sheet, { blankrows: false });
      textContent += `\n[Feuille: ${sheetName}]\n${sheetText}\n`;
    });

    return textContent;
  } catch (error) {
    console.error("Erreur extraction Excel:", error);
    throw error;
  }
};

// NOUVEAU: Support PowerPoint
const extractFromPowerPoint = async (filePath) => {
  try {
    const presentation = await pptx2json(filePath);
    let textContent = "";

    presentation.slides.forEach((slide, index) => {
      textContent += `\n[Diapositive ${index + 1}]\n`;
      slide.texts.forEach((text) => {
        textContent += text.content + "\n";
      });
    });

    return textContent;
  } catch (error) {
    console.error("Erreur extraction PowerPoint:", error);
    throw error;
  }
};

// NOUVEAU: OCR pour PDF scannés
const extractWithOCR = async (filePath) => {
  try {
    console.log("🔍 Lancement OCR sur PDF scanné...");
    const {
      data: { text },
    } = await Tesseract.recognize(
      filePath,
      "fra", // Langue française
      { logger: (m) => console.log(m) },
    );
    return text;
  } catch (error) {
    console.error("Erreur OCR:", error);
    throw error;
  }
};

// Fonction d'extraction améliorée
const extractTextFromFile = async (filePath, mimeType) => {
  try {
    console.log(`Extraction depuis: ${filePath}, type: ${mimeType}`);

    // PDF
    if (mimeType === "application/pdf") {
      const buffer = await fs.readFile(filePath);
      try {
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        await parser.destroy();

        let text = result.text
          .replace(/[\u00A0\u202F]/g, " ")
          .replace(/[\r\n]+/g, "\n")
          .replace(/\s+/g, " ")
          .trim();

        // Si texte trop court, tenter l'OCR
        if (text.length < 100) {
          console.log("⚠️ PDF possiblement scanné, tentative OCR...");
          text = await extractWithOCR(filePath);
        }

        return text;
      } catch (pdfError) {
        console.log("⚠️ Échec extraction normale, tentative OCR...");
        return await extractWithOCR(filePath);
      }
    }

    // Word
    if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value.replace(/\s+/g, " ").trim();
    }

    // Excel
    if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      return await extractFromExcel(filePath);
    }

    // PowerPoint
    if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ) {
      return await extractFromPowerPoint(filePath);
    }

    // Texte
    if (mimeType === "text/plain") {
      const content = await fs.readFile(filePath, "utf-8");
      return content.replace(/\s+/g, " ").trim();
    }

    throw new Error(`Type de fichier non supporté: ${mimeType}`);
  } catch (error) {
    console.error("Erreur extraction texte:", error);
    throw error;
  }
};
module.exports = {
  extractTextFromFile,
  detectSections: detectSectionsIntelligent,
  detectSectionsSimple,
  analyzeDocumentStructure,
};
