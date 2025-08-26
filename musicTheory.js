// musicTheory.js
// contient les constantes + fonctions generalistes

const INTERVALLES = {
  "P1": { nom: "Unisson juste", chroma: 0, raccourci: "P1", nature: "Juste" },
  "m2": { nom: "Seconde mineure", chroma: 1, raccourci: "m2", nature: "Mineur" },
  "M2": { nom: "Seconde majeure", chroma: 2, raccourci: "M2", nature: "Majeur" },
  "m3": { nom: "Tierce mineure", chroma: 3, raccourci: "m3", nature: "Mineur" },
  "M3": { nom: "Tierce majeure", chroma: 4, raccourci: "M3", nature: "Majeur" },
  "P4": { nom: "Quarte juste", chroma: 5, raccourci: "P4", nature: "Juste" },
  "A4": { nom: "Quarte augmentée", chroma: 6, raccourci: "A4", nature: "Augmenté" },
  "d5": { nom: "Quinte diminuée", chroma: 6, raccourci: "d5", nature: "Diminué" },
  "P5": { nom: "Quinte juste", chroma: 7, raccourci: "P5", nature: "Juste" },
  "m6": { nom: "Sixte mineure", chroma: 8, raccourci: "m6", nature: "Mineur" },
  "M6": { nom: "Sixte majeure", chroma: 9, raccourci: "M6", nature: "Majeur" },
  "m7": { nom: "Septième mineure", chroma: 10, raccourci: "m7", nature: "Mineur" },
  "M7": { nom: "Septième majeure", chroma: 11, raccourci: "M7", nature: "Majeur" },
  "P8": { nom: "Octave juste", chroma: 12, raccourci: "P8", nature: "Juste" }
};


const GAMMES = [
  { 
    nom: "Majeure", 
    signature: "101011010101",
    modes: ["Ionien", "Dorien", "Phrygien", "Lydien", "Mixolydien", "Éolien", "Locrien"]
  },
  { 
    nom: "Mineure harmonique", 
    signature: "101011001101",
    modes: ["Mineur harmonique", "Locrien ♮6", "Ionien #5", "Dorien #4", "Phrygien dominant", "Lydien #2", "Superlocrien bb7"]
  },
  { 
    nom: "Mineure mélodique", 
    signature: "101101010101",
    modes: ["Mineur mélodique", "Dorien b2", "Lydien augmenté", "Lydien dominant", "Mixolydien b6", "Éolien b5", "Superlocrien"]
  },
  { 
    nom: "Pentatonique", 
    signature: "101010010100",
    modes: ["Majeure", "Mode 2", "Mode 3", "Mode 4", "Mineure"]
  },
  { 
    nom: "Altérée", 
    signature: "111010101011",
    modes: ["Altérée"]
  },
  { 
    nom: "Chromatique", 
    signature: "111111111111",
    modes: ["Chromatique"]
  }
];


function genererRotations(signature) {
  let rotations = [];
  for (let i = 0; i < signature.length; i++) {
    rotations.push(signature.slice(i) + signature.slice(0, i));
  }
  return rotations;
}

function getAlteration(chromaReel, chromaReference) {
  const ecart = chromaReel - chromaReference;

  if (ecart === 0) return "";         // naturel
  if (ecart === 1) return "#";        // dièse
  if (ecart === 2) return "##";       // double dièse
  if (ecart === -1) return "b";       // bémol
  if (ecart === -2) return "bb";      // double bémol

  // Cas extrêmes : note trop éloignée, notation incertaine
  return "?";
}
function getNature(chromaReel, chromaReference) {
  const ecart = chromaReel - chromaReference;

   // intervalles justes
  if ((ecart === 0)&&([0,5,7].includes(chromaReel))) return "P";         // juste
  if ((ecart === 1)&&([0,5,7].includes(chromaReel))) return "A";        // augmenté
  if ((ecart === -1)&&([0,5,7].includes(chromaReel))) return "d";         // diminué
  if ((ecart === -2)&&([0,5,7].includes(chromaReel))) return "dd";         // double diminué
  if ((ecart === 2)&&([0,5,7].includes(chromaReel))) return "AA";       // double augmenté
  // intervalles majeurs
  if ((ecart === 0)&&(![0,5,7].includes(chromaReel))) return "M";         // majeur
  if ((ecart === 1)&&(![0,5,7].includes(chromaReel))) return "A";        // augmenté
  if ((ecart === -1)&&(![0,5,7].includes(chromaReel))) return "m";       // mineur
  if ((ecart === -2)&&(![0,5,7].includes(chromaReel))) return "d";         // diminué
  if ((ecart === 2)&&(![0,5,7].includes(chromaReel))) return "AA";       // double augmenté
  if ((ecart === -3)&&(![0,5,7].includes(chromaReel))) return "dd";      // double diminué  
  
  // Cas extrêmes : note trop éloignée, notation incertaine
  return "?";
}

function getRefNature(chroma) {
  const valides = ["Juste", "Majeur", "Mineur"];
  return  INTERVALLES.filter(filterType => filterType.chroma === chroma && valides.includes(filterType.nature))[0];
}

function calculerIntervalle(degre1, degre2) {
  const altToChroma = {
    "bb": -2, "b": -1,
    "#": 1, "##": 2
  };

  function extraireInfos(degre) {
    const match = degre.match(/(bb|b|##|#)?(\d)/);
    if (!match) return null;

    const alt = match[1] ?? "";
    const num = parseInt(match[2]);
    const altValue = altToChroma[alt] ?? 0;

    return { num, altValue };
  }

  const infos1 = extraireInfos(degre1);
  const infos2 = extraireInfos(degre2);
  if (!infos1 || !infos2) return null;

  const ecart = infos2.num - infos1.num;
  const numeroIntervalle = ecart + 1;

  const types = [null, "P", "M", "M", "P", "P", "M", "M", "P"];
  const type = types[Math.abs(numeroIntervalle)] ?? "?";

  // Chromas de la gamme majeure
  const chromasMajeur = [0, 2, 4, 5, 7, 9, 11];

  const chroma1 = chromasMajeur[infos1.num - 1] + infos1.altValue;
  const chroma2 = chromasMajeur[infos2.num - 1] + infos2.altValue;

  if (chroma1 == null || chroma2 == null) return null;

  const chromaReel = chroma2 - chroma1;

  const chromasRef = {
    1: 0,  2: 2,  3: 4,
    4: 5,  5: 7,  6: 9,
    7: 11, 8: 12
  };

  const chromaRef = chromasRef[Math.abs(numeroIntervalle)];
  const diff = chromaReel - chromaRef;

let qualite = "?";
const suiteP = ["dd", "d", "P", "A", "AA"];
const suiteM = ["dd", "d", "m", "M", "A", "AA"];

if (type === "P") qualite = suiteP[diff + 2] ?? "?";
else if (type === "M") qualite = suiteM[diff + 3] ?? "?";

  const signe = ecart < 0 ? "-" : "";
  return `${signe}${qualite}${Math.abs(numeroIntervalle)}`;
}





function toUnicodeAlteration(alteration) {
  return alteration
    .replace(/bb/g, '𝄫')   // double bémol
    .replace(/##/g, '𝄪')   // double dièse
    .replace(/b/g, '♭')    // simple bémol
    .replace(/#/g, '♯')    // simple dièse
    .replace(/♮/g, '♮');   // naturel
}

function parseLabel(label) {
  const degree = label.replace(/^[^0-9]+/, '');
  const alteration = toUnicodeAlteration(label.replace(/[0-9]/g, ''));
  return { degree, alteration };
}