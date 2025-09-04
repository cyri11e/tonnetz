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

// detecter la souris dans un triangle

function pointInTriangle(px, py, x1, y1, x2, y2, x3, y3) {
  const area = Math.abs((x1*(y2 - y3) + x2*(y3 - y1) + x3*(y1 - y2)) / 2);
  const s1 = Math.abs((px*(y2 - y3) + x2*(y3 - py) + x3*(py - y2)) / 2);
  const s2 = Math.abs((x1*(py - y3) + px*(y3 - y1) + x3*(y1 - py)) / 2);
  const s3 = Math.abs((x1*(y2 - py) + x2*(py - y1) + px*(y1 - y2)) / 2);
  return Math.abs(area - (s1 + s2 + s3)) < 0.5;
}

function pointInTriangleInner(px, py, x1, y1, x2, y2, x3, y3, shrink = 0.75) {
  const cx = (x1 + x2 + x3) / 3;
  const cy = (y1 + y2 + y3) / 3;
  const sx1 = cx + (x1 - cx) * shrink;
  const sy1 = cy + (y1 - cy) * shrink;
  const sx2 = cx + (x2 - cx) * shrink;
  const sy2 = cy + (y2 - cy) * shrink;
  const sx3 = cx + (x3 - cx) * shrink;
  const sy3 = cy + (y3 - cy) * shrink;
  return pointInTriangle(px, py, sx1, sy1, sx2, sy2, sx3, sy3);
}
