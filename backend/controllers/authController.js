const User = require("../models/User");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const Mailjet = require("node-mailjet");
const jwt = require("jsonwebtoken");

//utilisation de l'api mailjet
const mailjet = new Mailjet({
  apiKey: process.env.EMAIL_USER,
  apiSecret: process.env.EMAIL_PASSWORD,
});
//générer un token jwt
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      userName: user.userName,
      userEmail: user.userEmail,
    },
    process.env.JWT_SECRET,
    { expiresIn: "5h" },
  );
};
//liste des avatar disponible
const avatars = [
  "A1.jpg",
  "A2.jpg",
  "A3.jpg",
  "A4.jpg",
  "A5.jpg",
  "A6.jpg",
  "A7.jpg",
  "A8.jpg",
  "A9.jpg",
  "A10.jpg",
  "A11.jpg",
  "A12.jpg",
  "A13.jpg",
  "A14.jpg",
  "A15.jpg",
  "A16.jpg",
  "A17.jpg",
  "A18.jpg",
  "A19.jpg",
  "A20.jpg",
];
//selection au hasard d'un avatar
const getRandomAvatar = () => {
  const mix = Math.floor(Math.random() * avatars.length);
  return avatars[mix];
};
//fonction pour générer l'url de l'avatar
const getAvatarUrl = (avatarFileName, req, isDefault = true) => {
  if (isDefault) {
    return `${req.protocol}://${req.get("host")}/public/avatars/${avatarFileName}`;
  } else {
    return `${req.protocol}://${req.get("host")}/uploads/avatars/${avatarFileName}`;
  }
};
//inscriptionde l'user
const createUser = async (req, res) => {
  try {
    const { userName, userEmail, userPassword } = req.body;
    const userPasswordAgain = req.body.userPasswordAgain;
    //selection de l'avatar au hasard
    const randomavatar = getRandomAvatar();
    //géneration d'une url pour l'image
    const userPhoto = getAvatarUrl(randomavatar, req, true);
    if (!userName || !userEmail || !userPassword || !userPasswordAgain) {
      return res
        .status(400)
        .json({ message: "veuillez remplir tous les champs" });
    }
    //vérifions la similarité des mots depasse
    if (userPassword !== userPasswordAgain) {
      return res
        .status(400)
        .json({ message: "les mots de passe ne correspondent pas" });
    }
    //vérifions si l'user existe déjà
    const user = await User.findOne({ where: { userEmail } });
    if (user) {
      return res.status(400).json({ message: "l'utilisateur existe deja" });
    }
    //géneration d'un token
    const token = crypto.randomBytes(64).toString("hex");
    //hashage du password
    const salt = await bcrypt.genSalt(12);
    const hashedpassword = await bcrypt.hash(userPassword, salt);
    //création d'un nouvel utilisateur
    const newUser = await User.create({
      userName,
      userEmail,
      userPassword: hashedpassword,
      userPhoto,
      avatarType: "default", //type d'avatar(default/custom)
      avatarFileName: randomavatar, //nom de fichier
      validationToken: token,
      isActive: false,
    });
    //envoie de l'email de confirmation
    await mailjet.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: { Email: "simodimitri08@gmail.com", Name: "QuizGen-IA" },
          To: [{ Email: newUser.userEmail, Name: newUser.userName }],
          Subject: "Compte crée avec succès",
          HTMLPart: `
           <div style="text-align: center;">
              <h1 style="margin-bottom: 10px;">Bienvenue sur QuizGen-IA</h1>
              <img src="http://localhost:5000/public/logo.png" alt="Logo" style="width: 120px; height: 90px;" />
               <p>Bonjour ${newUser.userName}, votre compte a été crée avec succès.</p>
          <p>Veuillez confirmer votre compte en cliquant sur le lien suivant : <a href="http://localhost:5173/confirmation/${newUser.validationToken}">Confirmer mon compte</a></p>
          <p> à bientot sur QuizGen-IA !</p>
          <img src="${newUser.userPhoto}" alt="Votre avatar" style="width: 100px; height: 100px; border-radius: 50%;" />
              </div>
              
         
          `,
        },
      ],
    });
    //renvoyer les données de l'user
    return res.status(201).json({
      id: newUser.id,
      userName: newUser.userName,
      userEmail: newUser.userEmail,
      userPhoto: newUser.userPhoto,
      avatarType: newUser.avatarType,
      message: "utilisateur crée avec succès,veuillez confirmer votre compte",
    });
  } catch (error) {
    console.log("erreur de création de l'utilisateur", error);
    return res.status(500).json({ message: "erreur lors de l'inscription" });
  }
};
//validation de compte de l'user
const validateUserBytoken = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ where: { validationToken: token } });
    if (!user) {
      return res.status(404).json({ message: "utilisateur introuvable" });
    }
    if (user.isActive) {
      return res.status(400).json({ message: "utilisateur deja actif" });
    }
    user.validationToken = null;
    user.isActive = true;
    await user.save();
    return res.status(200).json({ message: "utilisateur actif avec succès" });
  } catch (error) {
    console.log("erreur de validation de l'utilisateur", error);
    return res
      .status(500)
      .json({ message: "erreur lors de la validation de l'utilisateur" });
  }
};
//connexion de l'user
const loginUser = async (req, res) => {
  try {
    const { userEmail, userPassword } = req.body;
    if (!userEmail || !userPassword) {
      return res
        .status(400)
        .json({ message: "veuillez remplir tous les champs" });
    }
    //on vérifie si l'user existe
    const user = await User.findOne({ where: { userEmail } });
    if (!user) {
      return res.status(404).json({ message: "utilisateur introuvable" });
    }
    //vérifions si le compte est actif
    if (!user.isActive) {
      return res.status(400).json({ message: "veuillez confirmer vos emails" });
    }
    //vérifions si le password est correct
    const passwordmatch = await bcrypt.compare(userPassword, user.userPassword);
    if (!passwordmatch) {
      return res.status(401).json({ message: "mot de passe incorrect" });
    }
    const token = generateToken(user);
    //configuration des cookies
    const cookieOptions = {
      httpOnly: true, //cookie accessible uniquement par le serveur
      secure: process.env.NODE_ENV === "production", // true en prod (HTTPS)
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      maxAge: 5 * 60 * 60 * 1000, // 5h
    };
    res.cookie("token", token, cookieOptions);
    user.last_login = new Date();
    await user.save();
    res.status(200).json({
      id: user.id,
      userName: user.userName,
      userEmail: user.userEmail,
      userPhoto: user.userPhoto,
      statut: user.statut,
      background_image: user.background_image,
    });
  } catch (error) {
    console.log("erreur de connexion de l'utilisateur", error);
    return res.status(500).json({ message: "erreur lors de la connexion" });
  }
};
//deconnexion de l'user
const logoutUser = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    });
    return res.status(200).json({ message: "deconnexion avec succès" });
  } catch (error) {
    console.log("erreur de deconnexion de l'utilisateur", error);
    return res.status(500).json({ message: "erreur lors de la deconnexion" });
  }
};

//générateur de code de vérification pour password
const generateVerificationCode = () => {
  const code = Math.floor(100000 + Math.random() * 900000);
  return code.toString().padStart(6, "0");
};
const forgotPassword = async (req, res) => {
  try {
    const { userEmail } = req.body;
    if (!userEmail) {
      return res
        .status(400)
        .json({ message: "veuillez remplir tous les champs" });
    }
    const user = await User.findOne({ where: { userEmail } });
    if (!user) {
      return res.status(404).json({ message: "utilisateur introuvable" });
    }
    const code = generateVerificationCode();
    //stockage temporaire du code de vérification
    storeCodes.set(userEmail, { code, timestamp: Date.now() });
    //nettoyage des codes expirés
    cleanExpire();
    //envoi de l'email
    await mailjet.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: { Email: "simodimitri08@gmail.com", Name: "QuizGen-IA" },
          To: [{ Email: user.userEmail, Name: user.userName }],
          Subject: "Code de réinitialisation de votre mot de passe",
          HTMLPart: `
           <div style="text-align: center;">
              <h1 style="margin-bottom: 10px;">QuizGen-IA</h1>
              <img src="http://localhost:5000/public/logo.png" alt="Logo" style="width: 120px; height: 90px;" />
              </div>
              
          <p>Hello ${user.userName}, voici votre code de réinitialisation de votre mot de passe.</p>
          <p>Code de réinitialisation: ${code}</p>
          <p>Ce code est valable pendant 5 minutes.</p>
          <img src="http://localhost:5000/public/logo.png" alt="Logo" style="width: 120px; height: 90px;" />
          `,
        },
      ],
    });
    return res.status(200).json({ message: "email envoyé" });
  } catch (error) {
    console.log("erreur de mot de passe oublie", error);
    return res
      .status(500)
      .json({ message: "erreur lors du mot de passe oublie" });
  }
};
//stockage temporaire du code de vérification
const storeCodes = new Map(); //map stocke les cles et les valeurs
//nettoyer les codes expirés
const cleanExpire = () => {
  const now = Date.now();
  for (const [userEmail, data] of storeCodes.entries()) {
    if (now - data.timestamp > 5 * 60 * 1000) {
      storeCodes.delete(userEmail);
    }
  }
};

//verification du code de réinitialisation de mot de passe
const verifycode = async (req, res) => {
  try {
    const { userEmail, userCode } = req.body;
    const entry = storeCodes.get(userEmail);
    if (!entry) {
      return res.status(404).json({ message: "aucun code trouvé ou expiré" });
    }
    if (Date.now() - entry.timestamp > 5 * 60 * 1000) {
      storeCodes.delete(userEmail);
      return res.status(404).json({ message: "code expiré" });
    }
    if (entry.code !== userCode) {
      return res.status(400).json({ message: "code incorrect" });
    }
    storeCodes.delete(userEmail);
    return res.status(200).json({ message: "code correct" });
  } catch (error) {
    console.log("erreur de verification du code", error);
    return res.status(500).json({ message: "erreur lors de la verification" });
  }
};
//reset de mot de passe
const resetPassword = async (req, res) => {
  try {
    const { userEmail, userPassword, verificationToken } = req.body;
    //verifier qu'un token valide existe pour cet email

    const validToken = await verificationToken.findOne({
      where: { userEmail, token: verificationToken, used: false },
    });

    if (!validToken) {
      return res.status(400).json({ message: "Token invalide ou expiré" });
    }

    // Marquer le token comme utilisé
    await validToken.update({ used: true });
    if (!userEmail || !userPassword) {
      return res
        .status(400)
        .json({ message: "veuillez remplir tous les champs" });
    }
    //verifier si l'user eexiste
    const user = await User.findOne({ where: { userEmail } });
    if (!user) {
      return res.status(404).json({ message: "utilisateur introuvable" });
    }
    //hash
    const hashed = await bcrypt.hash(userPassword, 10);
    user.userPassword = hashed;
    await user.save();
    return res.status(200).json({ message: "mot de passe mis à jour" });
  } catch (error) {
    console.log("erreur de reset de mot de passe", error);
    return res.status(500).json({ message: "erreur lors du reset" });
  }
};
module.exports = {
  createUser,
  validateUserBytoken,
  loginUser,
  logoutUser,
  forgotPassword,
  verifycode,
  resetPassword,
};
