import A1 from "../assets/avatar/A1.jpg";
import A2 from "../assets/avatar/A2.jpg";
import A3 from "../assets/avatar/A3.jpg";
import A4 from "../assets/avatar/A4.jpg";
import A5 from "../assets/avatar/A5.jpg";
import A6 from "../assets/avatar/A6.jpg";
import A7 from "../assets/avatar/A7.jpg";
import A8 from "../assets/avatar/A8.jpg";
import A9 from "../assets/avatar/A9.jpg";
import A10 from "../assets/avatar/A10.jpg";
import A11 from "../assets/avatar/A11.jpg";
import A12 from "../assets/avatar/A12.jpg";
import A13 from "../assets/avatar/A13.jpg";
import A14 from "../assets/avatar/A14.jpg";
import A15 from "../assets/avatar/A15.jpg";
import A16 from "../assets/avatar/A16.jpg";
import A17 from "../assets/avatar/A17.jpg";
import A18 from "../assets/avatar/A18.jpg";
import A19 from "../assets/avatar/A19.jpg";
import A20 from "../assets/avatar/A20.jpg";

import B1 from "../assets/para/arbre.jpg";
import B2 from "../assets/para/bateau.jpg";
import B3 from "../assets/para/board.jpeg";
import B4 from "../assets/para/cascade.jpg";
import B5 from "../assets/para/galaxie.jpeg";
import B6 from "../assets/para/mountains.jpg";
import B7 from "../assets/para/neige.jpg";
import B8 from "../assets/para/pink.jpeg";
import B9 from "../assets/para/water.jpg";

export interface AvatarType {
  id: number;
  avatar: string;
}
export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}
export interface Quiztheme {
  [theme: string]: QuizQuestion[];
}
export interface BackgroundType {
  id: number;
  background: string;
}
export interface Police {
  id: string;
  police: string;
  name: string;
}
export const Police: Police[] = [
  { id: "1", police: "Roboto", name: "Roboto" },
  { id: "2", police: "Lora", name: "Lora" },
  { id: "3", police: "Montserrat", name: "Montserrat" },
  { id: "4", police: "Pacifico", name: "Pacifico" },
  { id: "5", police: "Courier New", name: "Courier New" },
];

export const Avatar: AvatarType[] = [
  { id: 1, avatar: A1 },
  { id: 2, avatar: A2 },
  { id: 3, avatar: A3 },
  { id: 4, avatar: A4 },
  { id: 5, avatar: A5 },
  { id: 6, avatar: A6 },
  { id: 7, avatar: A7 },
  { id: 8, avatar: A8 },
  { id: 9, avatar: A9 },
  { id: 10, avatar: A10 },
  { id: 11, avatar: A11 },
  { id: 12, avatar: A12 },
  { id: 13, avatar: A13 },
  { id: 14, avatar: A14 },
  { id: 15, avatar: A15 },
  { id: 16, avatar: A16 },
  { id: 17, avatar: A17 },
  { id: 18, avatar: A18 },
  { id: 19, avatar: A19 },
  { id: 20, avatar: A20 },
];
export const Background: BackgroundType[] = [
  { id: 1, background: B1 },
  { id: 2, background: B2 },
  { id: 3, background: B3 },
  { id: 4, background: B4 },
  { id: 5, background: B5 },
  { id: 6, background: B6 },
  { id: 7, background: B7 },
  { id: 8, background: B8 },
  { id: 9, background: B9 },
];

export const quizDatabase: Quiztheme = {
  histoire: [
    {
      id: 1,
      question: "En quelle année a commencé la Révolution française ?",
      options: ["1787", "1789", "1791", "1793"],
      correctAnswer: 1, // index 1 = "1789"
    },
    {
      id: 2,
      question: "Qui était le premier président des États-Unis ?",
      options: [
        "Thomas Jefferson",
        "Benjamin Franklin",
        "George Washington",
        "Abraham Lincoln",
      ],
      correctAnswer: 2, // index 2 = "George Washington"
    },
    {
      id: 3,
      question: "Quand a eu lieu la bataille de Waterloo ?",
      options: ["1805", "1815", "1825", "1830"],
      correctAnswer: 1, // index 1 = "1815"
    },
    {
      id: 4,
      question: "Quelle civilisation a construit le Machu Picchu ?",
      options: ["Les Aztèques", "Les Incas", "Les Mayas", "Les Olmèques"],
      correctAnswer: 1, // index 1 = "Les Incas"
    },
    {
      id: 5,
      question: "Qui a découvert l'Amérique en 1492 ?",
      options: [
        "Vasco de Gama",
        "Fernand de Magellan",
        "Christophe Colomb",
        "James Cook",
      ],
      correctAnswer: 2, // index 2 = "Christophe Colomb"
    },
    {
      id: 6,
      question: "Quand a été signé le traité de Versailles ?",
      options: ["1917", "1919", "1921", "1923"],
      correctAnswer: 1, // index 1 = "1919"
    },
    {
      id: 7,
      question:
        "Qui était le pharaon célèbre de l'Égypte ancienne dont le tombeau a été découvert en 1922 ?",
      options: ["Ramsès II", "Cléopâtre", "Toutânkhamon", "Khéops"],
      correctAnswer: 2, // index 2 = "Toutânkhamon"
    },
    {
      id: 8,
      question: "Quelle guerre a opposé le Nord et le Sud aux États-Unis ?",
      options: [
        "Guerre de Sécession",
        "Guerre d'Indépendance",
        "Guerre de 1812",
        "Guerre hispano-américaine",
      ],
      correctAnswer: 0, // index 0 = "Guerre de Sécession"
    },
    {
      id: 9,
      question: "En quelle année a eu lieu la chute du mur de Berlin ?",
      options: ["1987", "1988", "1989", "1990"],
      correctAnswer: 2, // index 2 = "1989"
    },
    {
      id: 10,
      question:
        "Qui était le leader de l'Union soviétique pendant la Seconde Guerre mondiale ?",
      options: ["Lénine", "Staline", "Khrouchtchev", "Brejnev"],
      correctAnswer: 1, // index 1 = "Staline"
    },
    {
      id: 11,
      question:
        "Quelle reine anglaise a régné pendant 63 ans au 19ème siècle ?",
      options: ["Élisabeth I", "Marie Tudor", "Victoria", "Élisabeth II"],
      correctAnswer: 2, // index 2 = "Victoria"
    },
    {
      id: 12,
      question: "Quand a commencé la Première Guerre mondiale ?",
      options: ["1912", "1914", "1916", "1918"],
      correctAnswer: 1, // index 1 = "1914"
    },
    {
      id: 13,
      question: "Qui a peint la Joconde ?",
      options: ["Michel-Ange", "Raphaël", "Léonard de Vinci", "Donatello"],
      correctAnswer: 2, // index 2 = "Léonard de Vinci"
    },
    {
      id: 14,
      question: "Quelle année a marqué le début de la Révolution russe ?",
      options: ["1905", "1917", "1921", "1929"],
      correctAnswer: 1, // index 1 = "1917"
    },
    {
      id: 15,
      question: "Qui était le premier empereur romain ?",
      options: ["Jules César", "Auguste", "Caligula", "Néron"],
      correctAnswer: 1, // index 1 = "Auguste"
    },
  ],

  geographie: [
    {
      id: 1,
      question: "Quel est le plus grand océan du monde ?",
      options: [
        "Océan Atlantique",
        "Océan Indien",
        "Océan Pacifique",
        "Océan Arctique",
      ],
      correctAnswer: 2, // index 2 = "Océan Pacifique"
    },
    {
      id: 2,
      question: "Quelle est la plus longue rivière d'Afrique ?",
      options: ["Le Congo", "Le Nil", "Le Niger", "Le Zambèze"],
      correctAnswer: 1, // index 1 = "Le Nil"
    },
    {
      id: 3,
      question: "Dans quel pays se trouve le désert du Sahara ?",
      options: ["Australie", "Inde", "Chili", "Afrique du Nord"],
      correctAnswer: 3, // index 3 = "Afrique du Nord"
    },
    {
      id: 4,
      question: "Quelle est la capitale du Canada ?",
      options: ["Toronto", "Montréal", "Vancouver", "Ottawa"],
      correctAnswer: 3, // index 3 = "Ottawa"
    },
    {
      id: 5,
      question: "Quelle chaîne de montagnes sépare l'Europe de l'Asie ?",
      options: ["Les Alpes", "L'Himalaya", "Les Pyrénées", "L'Oural"],
      correctAnswer: 3, // index 3 = "L'Oural"
    },
    {
      id: 6,
      question:
        "Quel est le plus grand pays d'Amérique du Sud par sa superficie ?",
      options: ["Argentine", "Brésil", "Colombie", "Pérou"],
      correctAnswer: 1, // index 1 = "Brésil"
    },
    {
      id: 7,
      question: "Quel est le point culminant de la Terre ?",
      options: ["K2", "Mont Everest", "Kangchenjunga", "Lhotse"],
      correctAnswer: 1, // index 1 = "Mont Everest"
    },
    {
      id: 8,
      question: "Dans quel pays se trouve la Grande Barrière de Corail ?",
      options: ["Indonésie", "Philippines", "Australie", "Thaïlande"],
      correctAnswer: 2, // index 2 = "Australie"
    },
    {
      id: 9,
      question: "Quelle est la plus grande île du monde ?",
      options: ["Groenland", "Nouvelle-Guinée", "Bornéo", "Madagascar"],
      correctAnswer: 0, // index 0 = "Groenland"
    },
    {
      id: 10,
      question: "Quel fleuve traverse Paris ?",
      options: ["Le Rhin", "La Tamise", "La Seine", "Le Danube"],
      correctAnswer: 2, // index 2 = "La Seine"
    },
    {
      id: 11,
      question: "Dans quel continent se trouve le Kenya ?",
      options: ["Asie", "Amérique du Sud", "Afrique", "Europe"],
      correctAnswer: 2, // index 2 = "Afrique"
    },
    {
      id: 12,
      question: "Quelle est la capitale de l'Australie ?",
      options: ["Sydney", "Melbourne", "Canberra", "Perth"],
      correctAnswer: 2, // index 2 = "Canberra"
    },
    {
      id: 13,
      question: "Quel est le plus grand désert du monde ?",
      options: [
        "Désert d'Arabie",
        "Désert du Sahara",
        "Désert de Gobi",
        "Désert d'Atacama",
      ],
      correctAnswer: 1, // index 1 = "Désert du Sahara"
    },
    {
      id: 14,
      question: "Dans quel pays se trouve la ville de Venise ?",
      options: ["Espagne", "Portugal", "Italie", "Grèce"],
      correctAnswer: 2, // index 2 = "Italie"
    },
    {
      id: 15,
      question: "Quelle est la plus petite nation du monde en superficie ?",
      options: ["Monaco", "Nauru", "Tuvalu", "Vatican"],
      correctAnswer: 3, // index 3 = "Vatican"
    },
  ],

  capitale: [
    {
      id: 1,
      question: "Quelle est la capitale de l'Espagne ?",
      options: ["Barcelone", "Séville", "Madrid", "Valence"],
      correctAnswer: 2, // index 2 = "Madrid"
    },
    {
      id: 2,
      question: "Quelle est la capitale du Japon ?",
      options: ["Osaka", "Kyoto", "Tokyo", "Yokohama"],
      correctAnswer: 2, // index 2 = "Tokyo"
    },
    {
      id: 3,
      question: "Quelle est la capitale de l'Italie ?",
      options: ["Milan", "Naples", "Rome", "Florence"],
      correctAnswer: 2, // index 2 = "Rome"
    },
    {
      id: 4,
      question: "Quelle est la capitale de l'Allemagne ?",
      options: ["Munich", "Francfort", "Berlin", "Hambourg"],
      correctAnswer: 2, // index 2 = "Berlin"
    },
    {
      id: 5,
      question: "Quelle est la capitale de la Russie ?",
      options: ["Saint-Pétersbourg", "Moscou", "Novossibirsk", "Ekaterinbourg"],
      correctAnswer: 1, // index 1 = "Moscou"
    },
    {
      id: 6,
      question: "Quelle est la capitale du Brésil ?",
      options: ["Rio de Janeiro", "São Paulo", "Brasilia", "Salvador"],
      correctAnswer: 2, // index 2 = "Brasilia"
    },
    {
      id: 7,
      question: "Quelle est la capitale de l'Égypte ?",
      options: ["Alexandrie", "Le Caire", "Gizeh", "Louxor"],
      correctAnswer: 1, // index 1 = "Le Caire"
    },
    {
      id: 8,
      question: "Quelle est la capitale de l'Inde ?",
      options: ["Mumbai", "New Delhi", "Bangalore", "Kolkata"],
      correctAnswer: 1, // index 1 = "New Delhi"
    },
    {
      id: 9,
      question: "Quelle est la capitale de la Chine ?",
      options: ["Shanghai", "Pékin", "Canton", "Shenzhen"],
      correctAnswer: 1, // index 1 = "Pékin"
    },
    {
      id: 10,
      question: "Quelle est la capitale de l'Argentine ?",
      options: ["Córdoba", "Rosario", "Buenos Aires", "Mendoza"],
      correctAnswer: 2, // index 2 = "Buenos Aires"
    },
    {
      id: 11,
      question: "Quelle est la capitale du Mexique ?",
      options: ["Guadalajara", "Mexico", "Monterrey", "Puebla"],
      correctAnswer: 1, // index 1 = "Mexico"
    },
    {
      id: 12,
      question: "Quelle est la capitale de l'Afrique du Sud ?",
      options: ["Johannesburg", "Le Cap", "Pretoria", "Durban"],
      correctAnswer: 2, // index 2 = "Pretoria"
    },
    {
      id: 13,
      question: "Quelle est la capitale de la Turquie ?",
      options: ["Istanbul", "Ankara", "Izmir", "Bursa"],
      correctAnswer: 1, // index 1 = "Ankara"
    },
    {
      id: 14,
      question: "Quelle est la capitale de la Corée du Sud ?",
      options: ["Busan", "Séoul", "Incheon", "Daegu"],
      correctAnswer: 1, // index 1 = "Séoul"
    },
    {
      id: 15,
      question: "Quelle est la capitale de l'Australie ?",
      options: ["Sydney", "Melbourne", "Canberra", "Perth"],
      correctAnswer: 2, // index 2 = "Canberra"
    },
  ],

  football: [
    {
      id: 1,
      question: "Qui a remporté la Coupe du Monde 2022 ?",
      options: ["France", "Brésil", "Argentine", "Allemagne"],
      correctAnswer: 2, // index 2 = "Argentine"
    },
    {
      id: 2,
      question: "Quel joueur détient le record de Ballons d'Or ?",
      options: [
        "Cristiano Ronaldo",
        "Lionel Messi",
        "Zinédine Zidane",
        "Michel Platini",
      ],
      correctAnswer: 1, // index 1 = "Lionel Messi"
    },
    {
      id: 3,
      question:
        "Dans quel club Lionel Messi a-t-il commencé sa carrière professionnelle ?",
      options: [
        "Paris Saint-Germain",
        "FC Barcelone",
        "Newell's Old Boys",
        "Inter Miami",
      ],
      correctAnswer: 1, // index 1 = "FC Barcelone"
    },
    {
      id: 4,
      question:
        "Combien de joueurs composent une équipe de football sur le terrain ?",
      options: ["10", "11", "12", "13"],
      correctAnswer: 1, // index 1 = "11"
    },
    {
      id: 5,
      question: "Quel pays a remporté le plus de Coupes du Monde ?",
      options: ["Allemagne", "Italie", "Brésil", "Argentine"],
      correctAnswer: 2, // index 2 = "Brésil"
    },
    {
      id: 6,
      question:
        "Quel est le joueur le plus capé de l'histoire de l'équipe de France ?",
      options: [
        "Lilian Thuram",
        "Hugo Lloris",
        "Olivier Giroud",
        "Lilian Laslandes",
      ],
      correctAnswer: 1, // index 1 = "Hugo Lloris"
    },
    {
      id: 7,
      question: "Qui était surnommé 'El Fenómeno' ?",
      options: ["Ronaldinho", "Ronaldo", "Rivaldo", "Romário"],
      correctAnswer: 1, // index 1 = "Ronaldo"
    },
    {
      id: 8,
      question: "Quel club anglais joue à Old Trafford ?",
      options: ["Manchester City", "Liverpool", "Manchester United", "Chelsea"],
      correctAnswer: 2, // index 2 = "Manchester United"
    },
    {
      id: 9,
      question: "Quelle nation a remporté la première Coupe du Monde en 1930 ?",
      options: ["Brésil", "Italie", "Uruguay", "Argentine"],
      correctAnswer: 2, // index 2 = "Uruguay"
    },
    {
      id: 10,
      question: "Quel entraîneur a remporté le plus de Ligues des Champions ?",
      options: [
        "José Mourinho",
        "Pep Guardiola",
        "Carlo Ancelotti",
        "Alex Ferguson",
      ],
      correctAnswer: 2, // index 2 = "Carlo Ancelotti"
    },
    {
      id: 11,
      question:
        "Quelle équipe a remporté la Premier League anglaise invaincue en 2003-2004 ?",
      options: ["Manchester United", "Chelsea", "Arsenal", "Liverpool"],
      correctAnswer: 2, // index 2 = "Arsenal"
    },
    {
      id: 12,
      question:
        "Qui est le meilleur buteur de l'histoire de la Ligue des Champions ?",
      options: [
        "Raúl",
        "Robert Lewandowski",
        "Karim Benzema",
        "Cristiano Ronaldo",
      ],
      correctAnswer: 3, // index 3 = "Cristiano Ronaldo"
    },
    {
      id: 13,
      question: "Quelle nation a remporté l'Euro 2020 (joué en 2021) ?",
      options: ["France", "Portugal", "Angleterre", "Italie"],
      correctAnswer: 3, // index 3 = "Italie"
    },
    {
      id: 14,
      question:
        "Quel joueur a remporté la Coupe du Monde 1998 avec la France ?",
      options: [
        "Thierry Henry",
        "Zinédine Zidane",
        "Didier Deschamps",
        "Laurent Blanc",
      ],
      correctAnswer: 1, // index 1 = "Zinédine Zidane"
    },
    {
      id: 15,
      question: "Quel club a remporté le plus de Ligues des Champions ?",
      options: ["Bayern Munich", "Barcelone", "AC Milan", "Real Madrid"],
      correctAnswer: 3, // index 3 = "Real Madrid"
    },
  ],

  science: [
    {
      id: 1,
      question: "Quel est l'élément chimique dont le symbole est 'O' ?",
      options: ["Or", "Osmium", "Oxygène", "Oganesson"],
      correctAnswer: 2, // index 2 = "Oxygène"
    },
    {
      id: 2,
      question: "Qui a formulé la théorie de la relativité ?",
      options: [
        "Isaac Newton",
        "Niels Bohr",
        "Albert Einstein",
        "Stephen Hawking",
      ],
      correctAnswer: 2, // index 2 = "Albert Einstein"
    },
    {
      id: 3,
      question: "Quelle est la planète la plus proche du Soleil ?",
      options: ["Vénus", "Mars", "Mercure", "Jupiter"],
      correctAnswer: 2, // index 2 = "Mercure"
    },
    {
      id: 4,
      question: "Combien de chromosomes possède un être humain ?",
      options: ["23", "46", "48", "50"],
      correctAnswer: 1, // index 1 = "46"
    },
    {
      id: 5,
      question: "Quelle particule subatomique a une charge négative ?",
      options: ["Proton", "Neutron", "Électron", "Positron"],
      correctAnswer: 2, // index 2 = "Électron"
    },
    {
      id: 6,
      question: "Qui a découvert la pénicilline ?",
      options: [
        "Louis Pasteur",
        "Alexander Fleming",
        "Marie Curie",
        "Robert Koch",
      ],
      correctAnswer: 1, // index 1 = "Alexander Fleming"
    },
    {
      id: 7,
      question: "Quel gaz est principalement responsable de l'effet de serre ?",
      options: ["Oxygène", "Azote", "Dioxyde de carbone", "Hydrogène"],
      correctAnswer: 2, // index 2 = "Dioxyde de carbone"
    },
    {
      id: 8,
      question: "Quelle est l'unité de base de l'information en informatique ?",
      options: ["Byte", "Bit", "Octet", "Pixel"],
      correctAnswer: 1, // index 1 = "Bit"
    },
    {
      id: 9,
      question: "Quel organe du corps humain filtre le sang ?",
      options: ["Cœur", "Poumon", "Rein", "Foie"],
      correctAnswer: 2, // index 2 = "Rein"
    },
    {
      id: 10,
      question: "Quelle est la formule chimique de l'eau ?",
      options: ["CO2", "H2O", "NaCl", "O2"],
      correctAnswer: 1, // index 1 = "H2O"
    },
    {
      id: 11,
      question:
        "Qui a proposé la théorie de l'évolution par sélection naturelle ?",
      options: [
        "Gregor Mendel",
        "Charles Darwin",
        "Alfred Russel Wallace",
        "Jean-Baptiste Lamarck",
      ],
      correctAnswer: 1, // index 1 = "Charles Darwin"
    },
    {
      id: 12,
      question: "Quelle est la vitesse de la lumière dans le vide ?",
      options: [
        "300 000 km/s",
        "150 000 km/s",
        "500 000 km/s",
        "1 000 000 km/s",
      ],
      correctAnswer: 0, // index 0 = "300 000 km/s"
    },
    {
      id: 13,
      question: "Quel est l'os le plus long du corps humain ?",
      options: ["Humérus", "Fémur", "Tibia", "Radius"],
      correctAnswer: 1, // index 1 = "Fémur"
    },
    {
      id: 14,
      question: "Quelle planète est surnommée 'la planète rouge' ?",
      options: ["Vénus", "Mars", "Jupiter", "Saturne"],
      correctAnswer: 1, // index 1 = "Mars"
    },
    {
      id: 15,
      question: "Quelle maladie est causée par une carence en vitamine C ?",
      options: ["Rachitisme", "Béribéri", "Scorbut", "Anémie"],
      correctAnswer: 2, // index 2 = "Scorbut"
    },
  ],

  litterature: [
    {
      id: 1,
      question: "Qui a écrit 'Les Misérables' ?",
      options: [
        "Émile Zola",
        "Gustave Flaubert",
        "Victor Hugo",
        "Alexandre Dumas",
      ],
      correctAnswer: 2, // index 2 = "Victor Hugo"
    },
    {
      id: 2,
      question: "Quel est le titre du premier roman de la série Harry Potter ?",
      options: [
        "Harry Potter et la Coupe de feu",
        "Harry Potter et la Chambre des secrets",
        "Harry Potter à l'école des sorciers",
        "Harry Potter et le Prisonnier d'Azkaban",
      ],
      correctAnswer: 2, // index 2 = "Harry Potter à l'école des sorciers"
    },
    {
      id: 3,
      question: "Qui a écrit '1984' ?",
      options: ["Aldous Huxley", "George Orwell", "Ray Bradbury", "H.G. Wells"],
      correctAnswer: 1, // index 1 = "George Orwell"
    },
    {
      id: 4,
      question: "Quelle œuvre de Molière critique les faux dévots ?",
      options: [
        "L'Avare",
        "Le Tartuffe",
        "Le Misanthrope",
        "Les Femmes savantes",
      ],
      correctAnswer: 1, // index 1 = "Le Tartuffe"
    },
    {
      id: 5,
      question: "Qui a écrit 'Le Petit Prince' ?",
      options: [
        "Jules Verne",
        "Marcel Proust",
        "Antoine de Saint-Exupéry",
        "Albert Camus",
      ],
      correctAnswer: 2, // index 2 = "Antoine de Saint-Exupéry"
    },
    {
      id: 6,
      question:
        "Quel personnage de Shakespeare dit 'Être ou ne pas être, telle est la question' ?",
      options: ["Macbeth", "Roméo", "Hamlet", "Othello"],
      correctAnswer: 2, // index 2 = "Hamlet"
    },
    {
      id: 7,
      question: "Qui a écrit 'À la recherche du temps perdu' ?",
      options: [
        "Marcel Proust",
        "Gustave Flaubert",
        "Honoré de Balzac",
        "Émile Zola",
      ],
      correctAnswer: 0, // index 0 = "Marcel Proust"
    },
    {
      id: 8,
      question: "Quelle œuvre de Victor Hugo met en scène Quasimodo ?",
      options: [
        "Les Misérables",
        "Notre-Dame de Paris",
        "Les Contemplations",
        "Hernani",
      ],
      correctAnswer: 1, // index 1 = "Notre-Dame de Paris"
    },
    {
      id: 9,
      question: "Qui est l'auteur de 'L'Étranger' ?",
      options: [
        "Jean-Paul Sartre",
        "Simone de Beauvoir",
        "Albert Camus",
        "André Gide",
      ],
      correctAnswer: 2, // index 2 = "Albert Camus"
    },
    {
      id: 10,
      question:
        "Quel poète français du 19ème siècle est associé au symbolisme ?",
      options: [
        "Victor Hugo",
        "Charles Baudelaire",
        "Paul Verlaine",
        "Arthur Rimbaud",
      ],
      correctAnswer: 1, // index 1 = "Charles Baudelaire"
    },
    {
      id: 11,
      question: "Qui a écrit 'Vingt mille lieues sous les mers' ?",
      options: ["Jules Verne", "H.G. Wells", "Alexandre Dumas", "Émile Zola"],
      correctAnswer: 0, // index 0 = "Jules Verne"
    },
    {
      id: 12,
      question: "Quelle est la première pièce de théâtre de Jean Racine ?",
      options: ["Phèdre", "Andromaque", "Britannicus", "Les Plaideurs"],
      correctAnswer: 3, // index 3 = "Les Plaideurs"
    },
    {
      id: 13,
      question: "Qui est l'auteur de 'Cent ans de solitude' ?",
      options: [
        "Jorge Luis Borges",
        "Gabriel García Márquez",
        "Pablo Neruda",
        "Isabel Allende",
      ],
      correctAnswer: 1, // index 1 = "Gabriel García Márquez"
    },
    {
      id: 14,
      question: "Quelle tragédie de Racine met en scène Phèdre ?",
      options: ["Andromaque", "Britannicus", "Phèdre", "Bérénice"],
      correctAnswer: 2, // index 2 = "Phèdre"
    },
    {
      id: 15,
      question: "Qui a écrit 'Guerre et Paix' ?",
      options: [
        "Fiodor Dostoïevski",
        "Anton Tchekhov",
        "Léon Tolstoï",
        "Ivan Tourgueniev",
      ],
      correctAnswer: 2, // index 2 = "Léon Tolstoï"
    },
  ],
};
