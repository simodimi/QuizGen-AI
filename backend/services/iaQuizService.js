const { openai } = require("../config/openai");
const generateQuizFromText = async (text, options = {}) => {
  const {
    questionCount = 10,
    difficulty = "medium",
    questionTypes = ["qcm", "truefalse", "open"],
  } = options;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Tu es un expert en création de quiz éducatifs.
          
          Génère un quiz JSON STRICT basé sur le texte fourni.
          
          Format JSON obligatoire:
          {
            "title": "Titre du quiz basé sur le texte",
            "questions": [
              {
                "text": "Question claire et concise",
                "type": "qcm|truefalse|open",
                "choices": ["Option A", "Option B", "Option C", "Option D"] // uniquement pour type "qcm"
                "correctAnswer": "Réponse correcte",
                "explanation": "Explication pédagogique de la réponse"
              }
            ]
          }   
          Règles:
          1. ${questionCount} questions maximum
          2. Mélange les types: ${questionTypes.join(", ")}
          3. Pour QCM: 4 options, une seule bonne
          4. Pour Vrai/Faux: choices = ["Vrai", "Faux"]
          5. Pour ouvert: pas de choices
          6. Difficulté: ${difficulty}
          7. Questions basées uniquement sur le texte fourni`,
        },
        {
          role: "user",
          content: `Texte source:\n\n${text}\n\nGénère un quiz avec ${questionCount} questions.`,
        },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });
    //renvoie la réponse de l'ia du tableau des réponses en choississant une seule
    const result = JSON.parse(completion.choices[0].message.content);
    return result;
  } catch (error) {
    console.error("Erreur génération quiz IA:", error);
    throw new Error("Échec de la génération du quiz par IA");
  }
};

module.exports = {
  generateQuizFromText,
};
