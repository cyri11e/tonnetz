/****************************************************
 * helpers.js
 * Rôle : centraliser théorie musicale + utilitaires génériques
 ****************************************************/


// ==================================================
// [1] UTILITAIRES GÉNÉRIQUES — utilisé par : NoteNode, Tonnetz, Piano
// ==================================================

// Retourne n modulo 12 (pitch class)
function mod12(n) {
  return ((n % 12) + 12) % 12;
}

// Facteur de fondu (0 → invisible, 1 → plein) selon le temps écoulé
function getFadeFactor(lastTime) {
  const elapsed = millis() - lastTime;
  return 1 - Math.min(elapsed / CONFIG.fadeTime, 1);
}


// ==================================================
// [2] THÉORIE MUSICALE — utilisé par : Tonnetz, NoteNode, MidiInput, Piano
// ==================================================

// Noms de notes selon le style d'altération
const ENHARMONIC_MAPS = {
  sharp: ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'],
  flat:  ['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'],
  mixed: ['C','D♭','D','E♭','E','F','F♯','G','A♭','A','B♭','B']
};

// Style actif (par défaut : mixte)
let NOTE_NAMES = ENHARMONIC_MAPS.mixed;

// Fournit un pitch class (0–11) à partir d’un nom de note
const nameToPc = (name) => NOTE_NAMES.indexOf(name);

// Fournit un nom de note à partir d’un pitch class
const pcToName = (pc) => NOTE_NAMES[(pc % 12 + 12) % 12];

// Gère le style d'altération des noms affichés dans le Tonnetz
class NoteNamer {
  constructor(style = 'mixed') { this.setStyle(style); }
  setStyle(style) { this.style = style; this.names = ENHARMONIC_MAPS[style]; }
  nameToPc(name) { return this.names.indexOf(name); }
  pcToName(pc) { return this.names[(pc % 12 + 12) % 12]; }
  hasName(name) { return this.names.includes(name); }
}

// Vecteurs d'intervalles pour positionner les notes dans le Tonnetz
const U  = { x: 4,  y: 5 };   // +M3
const V  = { x: -3, y: 5 };   // +m3
const QV = { x: 7,  y: 0 };   // +P5

// Convertit une touche clavier en pitch class (selon le style actif)
function keyToPc(k) {
  const c = (k || '').toLowerCase();

  // Blancs : Q S D F G H J (K = C à l’octave)
  const whiteMap = {
    'q': 'C', 's': 'D', 'd': 'E', 'f': 'F',
    'g': 'G', 'h': 'A', 'j': 'B', 'k': 'C'
  };

  // Noirs : Z E T Y U
  const blackMap = {
    'z': 'C♯', 'e': 'D♯', 't': 'F♯', 'y': 'G♯', 'u': 'A♯'
  };

  const name = whiteMap[c] || blackMap[c];
  return name ? nameToPc(name) : null;
}
