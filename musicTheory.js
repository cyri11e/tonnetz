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
    signature: "101101011001",
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
  },
  { 
    nom: "Par ton", 
    signature: "101010101010",
    modes: ["Par ton"]
  },
  { 
    nom: "hexatonique", 
    signature: "101011101010",  
    modes: ["Hexatonique"]
  },
  { 
    nom: "octatonique (demi-ton/ton)",
    signature: "101010101011",  
    modes: ["Octatonique (demi-ton/ton)"]
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
  return "?a";
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
  return "n?";
}

// Calcule la "qualité" (P, M, m, A, d, AA, dd) d'un intervalle
// refChroma: demi-tons de l'intervalle de référence (ex: M3 = 4, P5 = 7)
// noteChroma: demi-tons observés pour ce degré dans la signature (0..11)
// refNature: "Juste" (famille parfaite), "Majeur" ou "Mineur" (famille majeure)
function getIntervalNature(refChroma, noteChroma, refNature) {
  // normalise l'écart pour rester proche (wrap 12)
  let delta = noteChroma - refChroma;
  while (delta > 6)  delta -= 12;
  while (delta < -6) delta += 12;

  const family = (refNature === "Juste") ? "P" : "M";

  if (family === "P") {
    switch (delta) {
      case  0: return "P";
      case +1: return "A";
      case -1: return "d";
      case +2: return "AA";
      case -2: return "dd";
      default: return delta > 0 ? "A" : "d";
    }
  } else {
    switch (delta) {
      case  0: return "M";
      case -1: return "m";
      case +1: return "A";
      case -2: return "d";
      case +2: return "AA";
      default: return delta > 0 ? "A" : "d";
    }
  }
}


function getRefNature(chroma) {
  const valides = ["Juste", "Majeur", "Mineur"];
  return  INTERVALLES.filter(filterType => filterType.chroma === chroma && valides.includes(filterType.nature))[0];
}

// function getIntervalFromNotes(noteA, noteB, semitones) {
//   const letters = ['C','D','E','F','G','A','B'];

//   const parsedA = parseNoteName(noteA);
//   const parsedB = parseNoteName(noteB);
//   if (!parsedA || !parsedB) return null;

//   const idxA = letters.indexOf(parsedA.letter);
//   const idxB = letters.indexOf(parsedB.letter);
//   if (idxA === -1 || idxB === -1) return null;

//   const pcA = nameToPc(noteA);
//   const pcB = nameToPc(noteB);
//   if (pcA === -1 || pcB === -1) return null;

//   // --- 1. Numéro d’intervalle diatonique ---
//   let ecartLettres = idxB - idxA;
//   let direction = "ascendant";
//   if (ecartLettres < 0) {
//     ecartLettres += 7;
//     direction = "descendant";
//   }
//   const numero = ecartLettres + 1;

//   // --- 2. Distance chromatique ---
//   let chroma = pcB - pcA;
//   if (chroma < 0) chroma += 12;

//   // --- 3. Intervalle de référence ---
//   const refKey = Object.keys(INTERVALLES).find(k => {
//     const i = INTERVALLES[k];
//     return parseInt(i.raccourci.slice(1)) === numero &&
//            (i.raccourci.startsWith('P') || i.raccourci.startsWith('M'));
//   });

//   const ref = INTERVALLES[refKey] ?? null;
//   if (!ref) return `?${numero}`;

//   const nature = getIntervalNature(ref.chroma, chroma, ref.nature);
//   const intervalLabel = `${(chroma < 0)?'-':'+'}${nature}${numero}`;

//   // --- 4. Affichage console ---
//   console.log(`🎵 ${noteA} → ${noteB} : ${intervalLabel} (${semitones} demi-tons, ${direction})`);

//   return intervalLabel;
// }

function getIntervalFromNotes(noteA, noteB, semitones) {
  const letters = ['C','D','E','F','G','A','B'];

  const parsedA = parseNoteName(noteA);
  const parsedB = parseNoteName(noteB);
  if (!parsedA || !parsedB || semitones == null) return null;

  const idxA = letters.indexOf(parsedA.letter);
  const idxB = letters.indexOf(parsedB.letter);
  if (idxA === -1 || idxB === -1) return null;

  const pcA = nameToPc(noteA);
  const pcB = nameToPc(noteB);
  if (pcA === -1 || pcB === -1) return null;

  // --- 1. Intervalle simple ---
  let ecartLettres = idxB - idxA;
  if (semitones < 0) ecartLettres = idxA - idxB;
  if (ecartLettres < 0) ecartLettres += 7;
  const numeroSimple = ecartLettres + 1;

  const chromaSimple = Math.abs(semitones) % 12;

  const refKey = Object.keys(INTERVALLES).find(k => {
    const i = INTERVALLES[k];
    return parseInt(i.raccourci.slice(1)) === numeroSimple &&
           (i.raccourci.startsWith('P') || i.raccourci.startsWith('M'));
  });

  const ref = INTERVALLES[refKey] ?? null;
  if (!ref) return `?${numeroSimple}`;

  const nature = getIntervalNature(ref.chroma, chromaSimple, ref.nature);

  // --- 2. Extension par octave ---
  const octaveOffset = Math.floor(Math.abs(semitones) / 12);
  const numeroFinal = numeroSimple + 7 * octaveOffset;

  const sign = semitones < 0 ? '-' : '+';
  const intervalLabel = `${sign}${nature}${numeroFinal}`;

  console.log(`🎵 ${noteA} → ${noteB} : ${intervalLabel} (${semitones} demi-tons)`);

  return intervalLabel;
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

let qualite = "i?";
const suiteP = ["dd", "d", "P", "A", "AA"];
const suiteM = ["dd", "d", "m", "M", "A", "AA"];

if (type === "P") qualite = suiteP[diff + 2] ?? "?";
else if (type === "M") qualite = suiteM[diff + 3] ?? "?";

  const signe = ecart < 0 ? "-" : "";
  return `${signe}${qualite}${Math.abs(numeroIntervalle)}`;
}


function getIntervalFromDegree(degre1, degre2, semitones) {
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
  if (!infos1 || !infos2 || semitones == null) return null;

  const ecart = infos2.num - infos1.num;
  const numeroIntervalle = Math.abs(ecart) + 1;

  const types = [null, "P", "M", "M", "P", "P", "M", "M", "P"];
  const type = types[numeroIntervalle] ?? "?";

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

  const chromaRef = chromasRef[numeroIntervalle];
  const diff = chromaReel - chromaRef;

  let qualite = "i?";
  const suiteP = ["dd", "d", "P", "A", "AA"];
  const suiteM = ["dd", "d", "m", "M", "A", "AA"];

  if (type === "P") qualite = suiteP[diff + 2] ?? "?";
  else if (type === "M") qualite = suiteM[diff + 3] ?? "?";

  const signe = semitones < 0 ? "-" : "+";
  return `${signe}${qualite}${numeroIntervalle}`;
}



function toUnicodeAlteration(rawNoteLabel) {
  if (!rawNoteLabel) return "";
  return rawNoteLabel
    .replace(/bb/g, '𝄫')   // double bémol
    .replace(/##/g, '𝄪')   // double dièse
    .replace(/b/g, '♭')    // simple bémol
    .replace(/#/g, '♯')    // simple dièse
    .replace(/♮/g, '♮');   // naturel
}

function parseDegree(rawDegree = '') {
  // 1) altération optionnelle, 2) chiffre obligatoire 1–7
  const match = rawDegree.match(/^(bb|b|##|#|♭|♯|𝄫|𝄪|♮)?([1-7])$/);
  if (!match) return null;

  // match[1] peut être undefined si pas d'altération
  let accidental = match[1] || '';
  // on convertit en caractère Unicode standard si nécessaire
  if (accidental) {
    accidental = toUnicodeAlteration(accidental);
  }

  const digit = match[2];
  return { digit, accidental };
}

function parseNoteName(noteName='') {
  const match = noteName.match(/^([A-G])(bb|b|##|#|♭|♯|𝄫|𝄪|♮)?$/);
  if (!match) return null;

  const letter = match[1];
  let accidental = match[2] || "";

  // Normalisation des altérations Unicode
  if (accidental) 
    accidental = toUnicodeAlteration(accidental);

  return { letter, accidental };
}

const ACC_ANGLE_NOTE = -30 * Math.PI / 180;
const ACC_ANGLE_DEGREE = -180 * Math.PI / 180;
const ACC_COS_NOTE   = Math.cos(ACC_ANGLE_NOTE);
const ACC_COS_DEGREE   = Math.cos(ACC_ANGLE_DEGREE);
const ACC_SIN_NOTE   = Math.sin(ACC_ANGLE_NOTE);
const ACC_SIN_DEGREE   = Math.sin(ACC_ANGLE_DEGREE);


function textNote(g, rawNote, x, y) {
  const parsed = parseNoteName(rawNote);
  if (!parsed) return;

  // dessine la lettre
  g.text(parsed.letter, x, y);

  // si altération, dessine à côté avec décalage
  if (parsed.accidental) {
    // récupère la taille de police courante (p5 stocke ça en interne)
    const fs = g.textSize() || 16;
    // rayon d’éloignement proportionnel à fs
    const r = fs * 0.6;
    const dx = ACC_COS_NOTE * r;
    const dy = ACC_SIN_NOTE * r;

    g.text(parsed.accidental, x + dx, y + dy);
  }
}

function textDegree(g, rawNote, x, y) {
  const parsed = parseDegree(rawNote);
  if (!parsed) return;

  // dessine la lettre
  g.text(parsed.digit, x, y);

  // si altération, dessine à côté avec décalage
  if (parsed.accidental) {
    // récupère la taille de police courante (p5 stocke ça en interne)
    const fs = g.textSize() || 16;
    // rayon d’éloignement proportionnel à fs
    const r = fs * 0.4;
    const dx = ACC_COS_DEGREE * r;
    const dy = ACC_SIN_DEGREE * r;

    g.text(parsed.accidental, x + dx, y + dy);
  }
}



// Noms de notes selon le style d'altération
const ENHARMONIC_MAPS = {
              sharp : ['C' ,'C♯','D' ,'D♯','E' ,'F' ,'F♯','G' ,'G♯','A' ,'A♯','B'],
              flat  : ['C' ,'D♭','D' ,'E♭','E' ,'F' ,'G♭','G' ,'A♭','A' ,'B♭','B'],
              mixed : ['C' ,'D♭','D' ,'E♭','E' ,'F' ,'F♯','G' ,'A♭','A' ,'B♭','B'],
        doubleSharp : ['B♯','B𝄪','C𝄪' ,'D♯','D𝄪','E♯','F♯','F𝄪','G♯','G𝄪' ,'A♯','A𝄪'],
        doubleFlat  : ['D𝄫','D♭','E𝄫','E♭','F♭','G𝄫','G♭','A𝄫','A♭','B♭','B𝄫','C♭']
      };

// Style actif (par défaut : mixte)
let NOTE_NAMES = ENHARMONIC_MAPS.mixed;

// Fournit un nom de note à partir d’un pitch class
const pcToName = (pc) => NOTE_NAMES[(pc % 12 + 12) % 12];

function nameToPc(name) {
  // trouve l index de la note dans l'un des 4 tableaux
  for (let style in ENHARMONIC_MAPS) {
    const arr = ENHARMONIC_MAPS[style];
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] === toUnicodeAlteration(name)) return i;
    }
  }
  return -1; // note non trouvée
}

function  getNextLetter(letter) {
    const letters = ['C','D','E','F','G','A','B'];
    const idx = letters.indexOf(letter);
    return letters[(idx + 1) % letters.length];
  }

function  getNextNoteLabel(currentLabel = '', semiTones = 1 ) {
    const  { letter, alteration }  = parseNoteName(currentLabel);
    currentIndex = nameToPc(currentLabel);
    
    if (currentIndex === -1) return null; // note non trouvée
    const nextIndex = (currentIndex + semiTones + 12) % 12;

    // recupere les 4 possibilites
    const possibles = [];
    for (let style in ENHARMONIC_MAPS) {
      const arr = ENHARMONIC_MAPS[style];
      possibles.push(arr[nextIndex]);
    }

    for (let note of possibles) {
      let nextLetter = getNextLetter(letter);
      if  (note.startsWith(nextLetter)) {
        return note;  // trouve la note suivante
      }
    }  
    return '%'; // pas trouvé
  }

function getRomanNumeral(degreeLabel, type) {
  // Extrait l’altération et le degré (1 à 7)
  const match = degreeLabel.match(/^(𝄫|♭|𝄪|♯|bb|b|##|#|♮)?([1-7])$/);
  if (!match) return '*';

  const rawAlt = match[1] ?? '';
  const num = parseInt(match[2]);

  // Normalise l’altération en Unicode
  const alt = toUnicodeAlteration(rawAlt);

  // Carte des chiffres romains
  const romanMap = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const roman = romanMap[num - 1];

  // Format selon le type d’accord
  let formatted;
  switch (type) {
    case 'min':  formatted = roman.toLowerCase(); break;
    case 'maj':  formatted = roman; break;
    case 'dim':  formatted = roman.toLowerCase() + '°'; break;
    case 'aug':  formatted = roman + '+'; break;
    default:     formatted = roman; break;
  }

  return `${alt}${formatted}`;
}

function drawRomanNumeral(g, degreeLabel, x, y, zoom) {
  const match = degreeLabel.match(/^([𝄫♭𝄪♯♮b#]{0,2})([ivIV]+)$/);
  if (!match) {
    //g.text('?');
    return;
  }

  const alt = toUnicodeAlteration(match[1] ?? '');
  const roman = match[2];

  const altWidth = g.textWidth(roman) / 2;
  const overlap = 5 * zoom;

  g.textFont(CONFIG.fontFamilyRoman);
  g.textStyle(NORMAL);
  g.textSize(CONFIG.fontSize * 1.5 * zoom);

  g.text(alt, x  - altWidth , y);
  g.text(roman, x + altWidth / 5 , y);
}
