# QuizGen AI - Générateur de Quiz Intelligent par RAG

[Version](https://img.shields.io/badge/version-1.0.0-blue)
[React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
[TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)
[Node.js](https://img.shields.io/badge/Node.js-18.x-339933?logo=node.js)
[Ollama](https://img.shields.io/badge/Ollama-Local-5B5B5B?logo=ollama)
[Qdrant](https://img.shields.io/badge/Qdrant-Vector%20DB-FF6B6B?logo=qdrant)
[Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?logo=socket.io)
[License](https://img.shields.io/badge/license-MIT-green)

## Table des matières

- [Aperçu](#aperçu)
- [Fonctionnalités](#fonctionnalités)
- [Architecture Technique](#architecture-technique)
- [Stack Technique](#stack-technique)
- [Installation](#installation)
- [Utilisation](#utilisation)
- [Améliorations Futures](#améliorations-futures)
- [Contact](#contact)

## Aperçu

**QuizGen AI** est une application full stack innovante qui transforme automatiquement vos documents (PDF) en quiz interactifs grâce à l'intelligence artificielle. Basée sur une architecture **RAG (Retrieval-Augmented Generation)**, l'application garantit des questions pertinentes et **sans hallucinations** en se basant uniquement sur le contenu fourni.

**Particularité technique** : J'utilise **Ollama en local** (modèle llama3.2:3b) plutôt qu'OpenAI pour la génération, ce qui rend l'application **100% gratuite et open source** Les embeddings sont générés avec **Ollama en local** et stockés dans **Qdrant Cloud** (vector database).

L'application propose des fonctionnalités sociales : mode **solo**, mode **multijoueur**, **messagerie temps réel**, **consultation des documents** et **historique des résultats** pour une expérience d'apprentissage collaborative.

**Cas d'usage** : Étudiants, formateurs, équipes produit souhaitant réviser ou évaluer des connaissances à partir de leurs propres documents.

## Fonctionnalités

## Core Features

- **Upload de documents** : Support PDF
- **Génération intelligente** : Création automatique de QCM et questions ouvertes via **Ollama (local)**
- **Anti-hallucination** : Architecture RAG garantissant des questions basées uniquement sur le contexte fourni
- **Quiz interactifs** : Interface de jeu fluide avec Material UI

## Social & Gamification

- **Mode solo** : Testez vos connaissances en autonomie
- **Mode multijoueur** : Affrontez d'autres joueurs en temps réel
- **Messagerie instantanée** : Chat intégré avec support des émojis
- **Historique complet** : Traçage de tous vos documents et résultats
- **Espace personnel** : Consultez vos documents uploadés et vos performances

## UX/UI

- **Design moderne** : Interface épurée avec Tailwind CSS et Material UI
- **Responsive design** : Optimisé mobile, tablette et desktop
- **Temps réel** : Mises à jour instantanées avec Socket.io
- **Animations fluides** : Framer Motion pour les transitions

## Architecture Technique

```
                    ┌─────────────────┐
                    │   Frontend      │
                    │  React 19/TS    │
                    │  Tailwind + MUI │
                    └────────┬────────┘
                             │ API REST
                             │ WebSocket
                    ┌────────▼────────┐
                    │   Backend       │
                    │  Node.js/Express│
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼───────┐    ┌───────▼───────┐    ┌───────▼───────┐
│   MySQL       │    │   Qdrant      │    │   Ollama       │
│ - Utilisateurs│    │  (Vector DB)  │    │  (Local)       │
│ - Parties     │    │ - Embeddings  │    │ - llama3.2:3b  │
│ - Messages    │    │ - Recherche   │    │ - Génération   │
│ - Documents   │    │   sémantique  │    │   de questions │
└───────────────┘    └───────────────┘    └────────┬───────┘
                                                     │
                                            ┌────────▼───────┐
                                            │   Google Gemini│
                                            │  - Embeddings  │
                                            └────────────────┘
```

## Pipeline RAG (Retrieval-Augmented Generation)

1. **Extraction** : Le texte est extrait du document uploadé (PDF via `pdf-parse`)
2. **Chunking** : Découpage en segments pertinents
3. **Embeddings** : Conversion des chunks en vecteurs
4. **Storage** : Stockage dans **Qdrant Cloud** (vector database)
5. **Recherche** : Lors de la génération, récupération des chunks pertinents par similarité vectorielle
6. **Génération** : Appel à **Ollama en local** (modèle llama3.2:3b) avec le contexte pour créer des questions
7. **Validation** : Les questions sont basées UNIQUEMENT sur le contenu fourni

---

## Stack Technique

### Frontend

- **Framework** : React 19 avec TypeScript
- **UI Library** : Material UI v7 + Tailwind CSS v4
- **State Management** : TanStack React Query v5
- **WebSocket** : Socket.io-client v4
- **HTTP Client** : Axios v1
- **Routing** : React Router DOM v7
- **Animations** : Framer Motion v12
- **Emojis** : Emoji Picker React v4
- **Dates** : date-fns v4
- **Validation** : Zod v4
- **Notifications** : React Toastify v11

### Backend

- **Runtime** : Node.js
- **Framework** : Express v5
- **WebSocket** : Socket.io v4
- **Authentification** : JWT + bcrypt
- **Upload fichiers** : Multer v2
- **Validation** : Express Validator v7
- **Sécurité** : Helmet v8, CORS, Rate Limiting
- **Compression** : Compression v1

### Base de données

- **SQL** : MySQL v8 (via mysql2 v3 + Sequelize ORM v6)
- **Vector DB** : Qdrant Cloud (via `@qdrant/js-client-rest`)

### IA & Machine Learning

- **LLM Local** : **Ollama** avec modèle `llama3.2:3b` (via API locale)
- **Embeddings** : Ollama
- **Framework IA** : LangChain.js v1
- **Alternative OpenAI** : SDK OpenAI v6 (présent mais non utilisé)

### Extraction de documents

- **PDF** : pdf-parse v2
- **Word** : mammoth v1
- **Excel** : xlsx v0
- **PowerPoint** : pptx2json v0
- **Images (OCR)** : tesseract.js v7

### Email & Notifications

- **Service email** : Mailjet v6 (via node-mailjet)
- **Cache** : node-cache v5

### Outils de développement

- **Build tool** : Vite v7
- **Tests** : Jest v30 + React Testing Library v16
- **E2E** : Playwright v1
- **Linting** : ESLint v9
- **TypeScript** : v5.9

---

## Installation

### Prérequis

- Node.js (v18 ou +)
- MySQL (v8 ou +)
- **Ollama** installé localement
- Compte Qdrant Cloud (gratuit)
- Compte Mailjet (pour les emails)

### 1. Cloner le dépôt

```bash
git clone https://github.com/simodimi/QuizGen-AI.git
cd QuizGen-AI
```

### 2. Installer Ollama (si ce n'est pas déjà fait)

```bash
# Sur macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh

# Sur Windows - télécharger depuis ollama.com

# Télécharger le modèle llama3.2:3b
ollama pull llama3.2:3b

# Vérifier qu'Ollama tourne
ollama serve
```

### 3. Backend

```bash
cd backend
npm install
```

Créez un fichier `.env` à la racine du dossier `backend` avec les variables fournies :

```env
# Configuration BDD
HOST="***************"
USER="***************"
PASSWORD="***************"
PORT="***************"
NAME="***************"
SERVER_PORT="***************"

# Mailjet
EMAIL_PORT="***************"
EMAIL_HOST="***************"
EMAIL_USER="***************"
EMAIL_PASSWORD="***************"
EMAIL_FROM="***************"
BASE_URL="***************"
APP_BASE_URL="***************"

# JWT
JWT_SECRET="***************"

# Environnement
NODE_ENV="development"

# Google Gemini (pour les embeddings)
GEMINI_API_KEY="***************"

# Qdrant (vector database)
QDRANT_API_Key="***************"
QDRANT_URL="***************"

# Hugging Face (optionnel)
HF_TOKEN="***************"

# Ollama (local)
OLLAMA_URL="***************"
OLLAMA_MODEL="***************"
```

### 4. Frontend

```bash
cd ../frontend
npm install
```

### 5. Base de données

```sql
mysql -u root -p"***************"
CREATE DATABASE QUIZIA;
USE QUIZIA;
```

Les tables seront créées automatiquement par Sequelize au premier démarrage.

### 6. Lancer l'application

**Terminal 1 - Démarrer Ollama :**

```bash
ollama serve
```

**Terminal 2 - Backend :**

```bash
cd backend
npm run dev
```

**Terminal 3 - Frontend :**

```bash
cd frontend
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

---

## Utilisation

### 1. Créer un compte / Se connecter

- Inscrivez-vous (vous recevrez un email de confirmation via Mailjet)
- Connectez-vous pour accéder à toutes les fonctionnalités

### 2. Uploader un document

- Allez dans l'onglet "Quiz"
- Suivez les étapes pour uploader un fichier PDF
- Le document est automatiquement traité (extraction, chunking, embeddings via Gemini)
- Les embeddings sont stockés dans Qdrant Cloud

### 3. Générer un quiz

- Depuis la liste de vos documents, cliquez sur "Générer un quiz"
- Choisissez le type de questions (QCM, questions ouvertes, ou mixte)
- Validez et attendez la génération par Ollama (modèle llama3.2 local)
- **100% gratuit** - pas d'appel à OpenAI !

### 4. Jouer

- **Mode solo** : Répondez aux questions et obtenez votre score immédiat
- **Mode multijoueur** :
  - Créez une partie ou rejoignez une partie existante
  - Discutez avec les autres joueurs via le chat intégré (avec émojis !)
  - Répondez aux questions en temps réel
  - Le classement s'affiche à la fin

### 5. Suivre votre progression

- **Mes documents** : Consultez tous vos documents uploadés
- **Historique** : Revoyez vos anciennes parties et vos scores

## Améliorations Futures (Idées)

- **Support de plus de formats** : Word, PowerPoint, Excel, images (via OCR Tesseract)
- **Mode hors ligne** : Application Progressive Web App (PWA)
- **Quiz adaptatifs** : Difficulté qui s'ajuste au niveau du joueur
- **Système de badges et récompenses**
- **Export des quiz** : PDF, CSV
- **API publique** : Pour intégration tierce
- **Modèles Ollama multiples** : Choix entre llama3, mistral, phi, etc.

---

## FAQ

**Q : Pourquoi avoir choisi Ollama plutôt qu'OpenAI ?**
R : Pour deux raisons : 1) **Gratuit et open source** - pas de coûts d'API, 2) **Confidentialité** - les données restent sur votre machine. Parfait pour un usage personnel ou éducatif !

**Q : Où sont stockés les embeddings ?**
R : Dans **Qdrant Cloud**, une vector database spécialisée dans la recherche sémantique. Le compte gratuit est suffisant pour ce projet.

**Q : Comment sont générés les embeddings ?**
R : J'utilise **Google Gemini** (`gemini-embedding-model`) car ils offrent une excellente qualité et un quota gratuit généreux.

**Q : Puis-je utiliser ce projet sans Ollama ?**
R : Oui ! Le code supporte aussi OpenAI (clé API présente dans le `.env`). Il suffit de changer la configuration.

**Q : Comment fonctionne le mode multijoueur ?**
R : Via **Socket.io** pour les communications temps réel. Les parties, les messages et les scores sont synchronisés instantanément.

**Q : Les documents sont-ils stockés ?**
R : Oui, les métadonnées dans MySQL, le contenu texte dans Qdrant (sous forme d'embeddings), et les fichiers originaux sur le serveur (via Multer).

## 📬 Contact

**Dimitri Simo**

- 📧 **Email** : simodimitri08@gmail.com
- 💼 **LinkedIn** : [linkedin.com/in/dimitrisimo](https://linkedin.com/in/dimitrisimo)
- 🐙 **GitHub** : [github.com/simodimi](https://github.com/simodimi)

**Lien direct du projet** : [github.com/simodimi/QuizGen-AI](https://github.com/simodimi/QuizGen-AI)
