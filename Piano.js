class Piano {
  constructor(size = 88, canvasWidth, canvasHeight) {
    this.canvasWidth  = canvasWidth;
    this.canvasHeight = canvasHeight;

    this.hide           = false;
    this.activeKeys     = new Set();
    this.keyLayouts     = [];
    this.keyXPositions  = {};
    this.yBase          = 0;
    this.whiteKeyHeight = 0;

    // 1) Ta config de tailles
    this.PIANO_SIZES = {
      88: { start: 21, end: 108 },
      76: { start: 28, end: 103 },
      61: { start: 36, end: 96  },
      49: { start: 36, end: 84  },
      25: { start: 48, end: 72  }
    };
    //this.availableSizes = Object.keys(this.PIANO_SIZES).map(Number).sort((a, b) => a - b);
    //this.currentSizeIndex = this.availableSizes.indexOf(size);
this.zoomLevel = 1.0;      // 1.0 = taille normale
this.panOffset = 0;        // en pixels

    const range      = this.PIANO_SIZES[size] || this.PIANO_SIZES[88];
    this.startMidi   = range.start;
    this.endMidi     = range.end;

    // 2) Tonalité d’octave (blanche vs noire)
    this.keyPattern = [
      true, false, true, false, true, true,
      false, true, false, true, false, true
    ];

    // 3) Maintenant que tout est en place, on initialise la grille
    this.initLayout(canvasWidth, canvasHeight);
  }

  changeSize(delta) {
    console.log("changeSize", delta);
    const len = this.availableSizes.length;
    this.currentSizeIndex = (this.currentSizeIndex + delta + len) % len;
    const newSize = this.availableSizes[this.currentSizeIndex];

    const range = this.PIANO_SIZES[newSize];
    this.startMidi = range.start;
    this.endMidi   = range.end;

    this.initLayout(this.canvasWidth, this.canvasHeight);
  }

  /**
   * Calcule une seule fois les coordonnées/taille de chaque touche
   * et remplit keyLayouts & keyXPositions.
   */
 initLayout(canvasWidth, canvasHeight) {
  // mémorise les dimensions pour les recalculs (zoom/pan/redraw)
  this.canvasWidth  = canvasWidth;
  this.canvasHeight = canvasHeight;

  const margin = 20;
  this.yBase   = canvasHeight - margin;

  // ensemble MIDI courant (tu peux garder this.startMidi/this.endMidi — ici ça supporte 88 ou autre)
  const countMidi = this.endMidi - this.startMidi + 1;
  const allMidis  = Array.from({ length: countMidi }, (_, i) => this.startMidi + i);

  // filtrage des blanches (pattern modulo 12)
  const whiteMidis = allMidis.filter(m => this.keyPattern[m % 12]);
  const numWhite   = whiteMidis.length;

  // dimensions de base + zoom/pan
  const baseWhiteW = (canvasWidth - margin * 2) / numWhite;
  const zoom       = this.zoomLevel ?? 1.0;
  const whiteW     = baseWhiteW * zoom;
  const whiteH     = whiteW * 4;
  const blackW     = whiteW ;   // largeur relative des noires
  const blackH     = whiteH ;    // hauteur relative des noires
  const startX     = margin - (this.panOffset ?? 0);

  this.whiteKeyHeight = whiteH;
  this.keyLayouts     = [];
  this.keyXPositions  = {};

  // 1) Prépare un tableau des touches blanches avec géométrie complète
// 1) Blanches
const whiteKeys = []; // ← tableau temporaire pour placement des noires
let wc = 0;
for (const midi of allMidis) {
  const pc = midi % 12;
  if (!this.keyPattern[pc]) continue;

  const x0      = startX + wc * whiteW;
  const w       = whiteW - 1;
  const h       = whiteH;
  const xCenter = x0 + w / 2;

  const keyType = {0:'C',2:'D',4:'E',5:'F',7:'G',9:'A',11:'B'}[pc];
  const isLeftEdge  = midi === 21;   // A0
  const isRightEdge = midi === 108;  // C8

  const key = {
    midi, type:'white',
    x: x0, y: this.yBase - h,
    w, h,
    keyType,
    isLeftEdge,
    isRightEdge
  };

  this.keyLayouts.push(key);
  this.keyXPositions[midi] = xCenter;
  whiteKeys.push(key); // ← stocké pour placement des noires
  wc++;
}


  // 3) Place les noires précisément entre blanches adjacentes
  //    Pour chaque noire, on trouve la blanche à gauche et à droite dans whiteMidis,
  //    puis on place le centre au milieu de l’espace entre leurs bords.
  for (const midi of allMidis) {
    const pc = midi % 12;
    if (this.keyPattern[pc]) continue; // skip blanches

    // index de la première blanche strictement > midi
    let rightIdx = whiteMidis.findIndex(m => m > midi);
    if (rightIdx === -1) continue; // aucune blanche à droite (ne devrait pas arriver au milieu de la tessiture)

    const leftIdx = rightIdx - 1;
    if (leftIdx < 0) continue;      // aucune blanche à gauche (idem)

    const leftWhite  = whiteKeys[leftIdx];
    const rightWhite = whiteKeys[rightIdx];

    const leftEdge  = leftWhite.x + leftWhite.w; // bord droit de la blanche de gauche
    const rightEdge = rightWhite.x;               // bord gauche de la blanche de droite
    const xCenter   = (leftEdge + rightEdge) / 2;

    // géométrie de la touche noire (drawBlack attend x comme "centre" puisque rect(x - w/3, ...))
    const x = xCenter;
    const y = this.yBase - whiteH;

    this.keyLayouts.push({
      midi, type: 'black',
      x, y, w: blackW, h: blackH
    });
    this.keyXPositions[midi] = xCenter;
  }

  // 4) Option: ordonner pour dessiner blanches puis noires au-dessus (si besoin)
  this.keyLayouts.sort((a, b) => {
    if (a.type === b.type) return a.midi - b.midi;
    return a.type === 'white' ? -1 : 1; // blanches d'abord
  });
}


  getKeyCenter(midi) {
    return this.keyXPositions[midi] ?? null;
  }

  setMidiNotes(midiNums = []) {
    this.activeKeys = new Set(midiNums);
  }

  draw(g, rootPc = null) {
    if (this.hide) return;
    g.push();

    // Dessin touches
    for (const key of this.keyLayouts) {
      const active = this.activeKeys.has(key.midi);
      const root   = active && rootPc !== null && (key.midi % 12) === rootPc;
      if (key.type === 'white') {
        this.drawWhiteKey(g, key.x, key.y, key.w, key.h, key.keyType, active, root, key.isLeftEdge, key.isRightEdge);
      } else {
        this.drawBlackKey(g, key.x, key.y, key.w, key.h, active, root);
      }
    }

    // Intervalle si 2 notes
    const played = Array.from(this.activeKeys);
if (played.length === 2) {
  const fallback = [
    "P1", "m2", "M2", "m3", "M3",
    "P4", "d5", "P5", "m6", "M6",
    "m7", "M7"
  ];
  played.sort((a, b) => a - b);
  const [m1, m2] = played;
  const x1 = this.getKeyCenter(m1);
  const x2 = this.getKeyCenter(m2);
  if (x1 == null || x2 == null) return;

  const semisTotal = m2 - m1;
  const rawOctaves = Math.floor(semisTotal / 12);
  // On ne garde qu’au plus 1 octave d’extension
  const octaves    = rawOctaves > 1 ? 1 : rawOctaves;
  const semisMod   = semisTotal % 12;

let label;
if (semisMod === 0) {
  label = "P8"; // unisson ou octave exacte
} else {
  const baseLabel = fallback[semisMod] || "";
  const parsed = parseDegree(baseLabel);

  if (!parsed) {
    label = baseLabel; // fallback brut si parsing échoue
  } else {
    const { digit, accidental } = parsed;
    const fullDegree = parseInt(digit, 10) + octaves * 7;
    label = `${accidental}${fullDegree} (${baseLabel})`;
  }
}


  // tracé de la ligne
  const yLine = this.yBase - this.whiteKeyHeight - 1;
  g.push();
  g.stroke(CONFIG.colors.playedStroke);
  g.strokeWeight(2);
  g.line(x1, yLine, x2, yLine);
  g.pop();

  // affichage du label centré
  const xText = (x1 + x2) / 2;
  const yText = yLine - 6;
  g.push();
  g.textAlign(g.CENTER, g.BOTTOM);
  g.textSize(CONFIG.fontSize || 16);
  g.text(label, xText, yText);
  g.pop();
}




    g.pop();
  }


  // Nouvelle méthode pour dessiner une touche blanche selon son type
drawWhiteKey(g, x, y, w, h, type, isActive, isRoot, isLeftEdge, isRightEdge) {
  g.fill(isRoot ? CONFIG.colors.rootStroke :
         isActive ? CONFIG.colors.playedStroke :
         '#ffffff');
  g.stroke(40);
  g.strokeWeight(1);

  g.beginShape();

  // 🧨 Cas extrêmes : A0, C8, B final
  if (isLeftEdge && type === 'A') {
    // A0 → forme en L (déjà gérée dans switch, donc rien à faire ici)
  } else if (isRightEdge && type === 'C') {
    // C8 → rectangle plein
    g.vertex(x, y);
    g.vertex(x + w, y);
    g.vertex(x + w, y + h);
    g.vertex(x, y + h);
    g.endShape(CLOSE);
    return;
  } else if (isRightEdge && type === 'B') {
    // B final → rectangle plein
    g.vertex(x, y);
    g.vertex(x + w, y);
    g.vertex(x + w, y + h);
    g.vertex(x, y + h);
    g.endShape(CLOSE);
    return;
  }

  // 🎹 Formes normales selon type
  switch(type) {
    case 'C': 
    case 'F':
    case 'A': // Forme en L
      g.vertex(x, y);
      g.vertex(x, y + h);
      g.vertex(x + w, y + h);
      g.vertex(x + w, y + h * 0.6);
      g.vertex(x + w/1.5, y + h * 0.6);
      g.vertex(x + w/1.5, y);
      break;

    case 'E':
    case 'B': // Miroir du C
      g.vertex(x + w/3, y);
      g.vertex(x + w, y);
      g.vertex(x + w, y + h);
      g.vertex(x, y + h);
      g.vertex(x, y + h * 0.6);
      g.vertex(x + w/3, y + h * 0.6);
      break;

    case 'D':
    case 'G': // Forme en T
      g.vertex(x + w/3, y);
      g.vertex(x + w/1.5, y);
      g.vertex(x + w/1.5, y + h * 0.6);
      g.vertex(x + w, y + h * 0.6);
      g.vertex(x + w, y + h);
      g.vertex(x, y + h);
      g.vertex(x, y + h * 0.6);
      g.vertex(x + w/3, y + h * 0.6);
      break;

    default: // Rectangle simple
      g.vertex(x, y);
      g.vertex(x + w, y);
      g.vertex(x + w, y + h);
      g.vertex(x, y + h);
  }

  g.endShape(CLOSE);
}




  drawBlackKey(g, x, y, w, h, isActive, isRoot) {
    g.push();
    g.noStroke();
    g.fill(isRoot ? CONFIG.colors.rootStroke :
           isActive ? CONFIG.colors.playedStroke :
           '#000000');
    // Touche noire plus large (2/3 au lieu de 1/2)
    g.rect(x - w/3, y, w * 0.67, h * 0.6);
    g.pop();
  }



  handleScroll(mouseY) {
  const zoneHeight = this.canvasHeight;
  const ratio = 1 - mouseY / zoneHeight; // haut = 1, bas = 0

  const index = Math.floor(ratio * this.availableSizes.length);
  const clampedIndex = Math.max(0, Math.min(this.availableSizes.length - 1, index));

  if (clampedIndex !== this.currentSizeIndex) {
    this.currentSizeIndex = clampedIndex;
    const newSize = this.availableSizes[clampedIndex];
    const range = this.PIANO_SIZES[newSize];
    this.startMidi = range.start;
    this.endMidi   = range.end;
    this.initLayout(this.canvasWidth, this.canvasHeight);
  }
}

setZoom(factor) {
  this.zoomLevel = constrain(this.zoomLevel * factor, 1, 3.0);
  this.initLayout(this.canvasWidth, this.canvasHeight);
}

setPan(deltaX) {
  const margin = 20;

  // 1. Calcul du nombre de touches blanches
  const whiteMidis = Array.from(
    { length: this.endMidi - this.startMidi + 1 },
    (_, i) => this.startMidi + i
  ).filter(m => this.keyPattern[m % 12]);

  const numWhite = whiteMidis.length;

  // 2. Largeur réelle du clavier (zoomée)
  const baseWhiteW = (this.canvasWidth - margin * 2) / numWhite;
  const whiteW     = baseWhiteW * this.zoomLevel;
  const totalWidth = numWhite * whiteW;

  // 3. Limites du pan
  const maxPan = Math.max(0, totalWidth - this.canvasWidth + margin * 2);

  // 4. Mise à jour du panOffset (inversé pour déplacement du composant)
  this.panOffset = constrain(this.panOffset - deltaX, 0, maxPan);

  // 5. Recalcul du layout
  this.initLayout(this.canvasWidth, this.canvasHeight);
}



}