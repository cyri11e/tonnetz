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

this.targetZoomLevel = this.zoomLevel;
this.targetPanOffset = this.panOffset;

this.userZoomLevel = this.zoomLevel;     // référence MANUELLE persistante
this.userPanOffset = this.panOffset;     // référence MANUELLE persistante

this.autoPanZoomEnabled = false;
this.lastZoomChangeTime = 0;
this.minZoomHoldTime = 5000; // en ms

// à l'init ou via un setter depuis l'UI parent
this.viewportLeft = 0; // x écran où commence le piano

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
getLocalMouseX(screenMouseX) {
  const local = screenMouseX - this.viewportLeft;
  // ancrer dans la zone utile pour éviter les sauts près des bords
  const margin = 20;
  return Math.max(margin, Math.min(this.canvasWidth - margin, local));
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
  this.autoPanZoomEnabled = true;
  this.autoPanZoom(midiNums);
}



 draw(g, rootPc = null) {
  if (this.hide) return;
  this.updateTransition();

  g.push();

  // Initialisation du tracking visible
  this.visibleMinMidi = null;
  this.visibleMaxMidi = null;

  let previousMidi = null;
  let foundFirstVisible = false;

  // Coordonnées écran
  const canvasW = this.canvasWidth;
  const canvasH = this.canvasHeight;

  // Dessin des touches
  for (const key of this.keyLayouts) {
    const active = this.activeKeys.has(key.midi);
    const root   = active && rootPc !== null && (key.midi % 12) === rootPc;

    if (key.type === 'white') {
      // Détection visibilité écran
      const keyLeft  = key.x;
      const keyRight = key.x + key.w;
      const isVisible = keyRight >= 0 && keyLeft <= canvasW;

      if (!foundFirstVisible && isVisible) {
        this.visibleMinMidi = previousMidi ?? key.midi;
        foundFirstVisible = true;
      }

      if (foundFirstVisible && !isVisible && this.visibleMaxMidi === null) {
        this.visibleMaxMidi = previousMidi;
      }

      previousMidi = key.midi;

      this.drawWhiteKey(g, key.x, key.y, key.w, key.h, key.keyType, active, root, key.isLeftEdge, key.isRightEdge);
    } else {
      this.drawBlackKey(g, key.x, key.y, key.w, key.h, active, root);
    }
  }

  // Si aucune touche hors champ détectée, on prend la dernière blanche
  if (this.visibleMaxMidi === null) {
    this.visibleMaxMidi = previousMidi;
  }

  // Affichage de l'intervalle si 2 notes
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
    if (x1 != null && x2 != null) {
      const semisTotal = m2 - m1;
      const rawOctaves = Math.floor(semisTotal / 12);
      const octaves    = rawOctaves > 1 ? 1 : rawOctaves;
      const semisMod   = semisTotal % 12;

      let label;
      if (semisMod === 0) {
        label = "P8";
      } else {
        const baseLabel = fallback[semisMod] || "";
        const parsed = parseDegree(baseLabel);
        if (!parsed) {
          label = baseLabel;
        } else {
          const { digit, accidental } = parsed;
          const fullDegree = parseInt(digit, 10) + octaves * 7;
          label = `${accidental}${fullDegree} (${baseLabel})`;
        }
      }

      const yLine = this.yBase - this.whiteKeyHeight - 1;
      g.push();
      g.stroke(CONFIG.colors.playedStroke);
      g.strokeWeight(2);
      g.line(x1, yLine, x2, yLine);
      g.pop();

      const xText = (x1 + x2) / 2;
      const yText = yLine - 6;
      g.push();
      g.textAlign(g.CENTER, g.BOTTOM);
      g.textSize(CONFIG.fontSize || 16);
      g.text(label, xText, yText);
      g.pop();
    }
  }

  // Affichage des infos de debug (coordonnées souris + plage visible)
  g.push();
  g.fill(0);
  g.textAlign(g.LEFT, g.TOP);
  g.textSize(14);
  g.text(
    `Mouse: x=${Math.round(mouseX)}, y=${Math.round(mouseY)}\n` +
    `Visible range: ${this.visibleMinMidi} → ${this.visibleMaxMidi}`,
    10, 10
  );
  g.pop();

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

setZoom(factor, screenMouseX = null) {
  this.autoPanZoomEnabled = false;

  const margin      = 20;
  const canvasW     = this.canvasWidth;
  const currentZoom = this.zoomLevel;
  const nextZoom    = constrain(currentZoom * factor, 1.0, 3.0);

  // 1) Souris en repère local piano
  const mouseXLocal = screenMouseX == null
    ? this.canvasWidth / 2
    : this.getLocalMouseX(screenMouseX);

  // 2) Point logique sous la souris (repère musical)
  const logicalX = (mouseXLocal - margin + this.panOffset) / currentZoom;

  // 3) Nouveau pan pour garder logicalX sous la souris après zoom
  let newPan = (logicalX * nextZoom) - (mouseXLocal - margin);

  // 4) Clamp du pan avec la largeur “monde” au nouveau zoom
  const whiteMidis  = Array.from({ length: this.endMidi - this.startMidi + 1 }, (_, i) => this.startMidi + i)
                        .filter(m => this.keyPattern[m % 12]);
  const baseWhiteW  = (canvasW - margin * 2) / whiteMidis.length;
  const totalWidth  = whiteMidis.length * baseWhiteW * nextZoom;
  const maxPan      = Math.max(0, totalWidth - canvasW + margin * 2);
  newPan = Math.max(0, Math.min(newPan, maxPan));

  // 5) Appliquer (manuel = vérité)
  this.zoomLevel        = nextZoom;
  this.userZoomLevel    = nextZoom;
  this.targetZoomLevel  = nextZoom;
  this.panOffset        = newPan;
  this.userPanOffset    = newPan;
  this.targetPanOffset  = newPan;

  this.initLayout(this.canvasWidth, this.canvasHeight);
}






setPan(deltaX) {
  this.autoPanZoomEnabled = false;
  const margin = 20;

  const whiteMidis = Array.from(
    { length: this.endMidi - this.startMidi + 1 },
    (_, i) => this.startMidi + i
  ).filter(m => this.keyPattern[m % 12]);

  const numWhite = whiteMidis.length;
  const baseWhiteW = (this.canvasWidth - margin * 2) / numWhite;
  const whiteW     = baseWhiteW * this.zoomLevel;
  const totalWidth = numWhite * whiteW;
  const maxPan     = Math.max(0, totalWidth - this.canvasWidth + margin * 2);

  this.panOffset = constrain(this.panOffset - deltaX, 0, maxPan);
  this.userPanOffset = this.panOffset;  // ← on mémorise le choix utilisateur
  this.targetPanOffset = this.panOffset; // ← stoppe toute transition en cours

  this.initLayout(this.canvasWidth, this.canvasHeight);
}

autoPanZoom(notes = []) {
  if (!notes.length) return;

  const margin   = 20;
  const canvasW  = this.canvasWidth;
  const visibleW = canvasW - margin * 2;

  const minNote = Math.min(...notes);
  const maxNote = Math.max(...notes);

  const getKey = (midi) =>
    this.keyLayouts.find(k => k.midi === midi && k.type === 'white') ||
    this.keyLayouts.find(k => k.midi === midi);

  const minKey = getKey(minNote);
  const maxKey = getKey(maxNote);
  if (!minKey || !maxKey) return;

  const groupLeft  = minKey.x;
  const groupRight = maxKey.x + maxKey.w;
  const groupWidth = groupRight - groupLeft;

  const allMidis    = Array.from({ length: this.endMidi - this.startMidi + 1 }, (_, i) => this.startMidi + i);
  const whiteMidis  = allMidis.filter(m => this.keyPattern[m % 12]);
  const baseWhiteW  = (canvasW - margin * 2) / whiteMidis.length;
  const whiteW      = baseWhiteW * this.zoomLevel;
  const marginPx    = 2 * whiteW;
  const totalWidth  = whiteMidis.length * whiteW;
  const maxPan      = Math.max(0, totalWidth - canvasW + margin * 2);

  const setTargetZoom = (z) => {
    if (Math.abs(this.targetZoomLevel - z) > 1e-4) {
      this.targetZoomLevel = z;
      this.autoPanZoomEnabled = true;
    }
  };

  const setTargetPan = (p) => {
    if (Math.abs(this.targetPanOffset - p) > 0.25) {
      this.targetPanOffset = p;
      this.autoPanZoomEnabled = true;
    }
  };

  // 🧨 Si le groupe est trop large → dézoom, et on ignore le pan
  if (groupWidth > visibleW) {
    const spanCount   = whiteMidis.filter(m => m >= minNote && m <= maxNote).length;
    const targetCount = spanCount + 4; // marge de 2 blanches de chaque côté
    const maxZoomFit  = visibleW / (baseWhiteW * targetCount);
const targetZoom = Math.max(0.4, Math.min(this.userZoomLevel, maxZoomFit));
const zoomRatio  = targetZoom / this.zoomLevel;

const groupCenter   = (groupLeft + groupRight) / 2;
const canvasCenter  = canvasW / 2;

// Compensation du zoom pour garder le centre musical à l’écran
const newPan = this.panOffset + (groupCenter - canvasCenter) * (1 - zoomRatio);
const clampedPan = Math.max(0, Math.min(newPan, maxPan));

this.targetZoomLevel     = targetZoom;
this.targetPanOffset     = clampedPan;
this.autoPanZoomEnabled  = true;
this.lastZoomChangeTime  = Date.now();
return;

  }

  // ✅ Si le groupe tient dans le cadre → pan vers les extrémités si besoin
  if (minKey.x < 0) {
    const targetL = marginPx;
    const delta = targetL - minKey.x;
    if (delta > 0) {
      const p = Math.max(0, Math.min(this.panOffset - delta, maxPan));
      setTargetPan(p);
      return;
    }
  }

  if (maxKey.x + maxKey.w > canvasW) {
    const targetR = canvasW - marginPx;
    const delta = (maxKey.x + maxKey.w) - targetR;
    if (delta > 0) {
      const p = Math.max(0, Math.min(this.panOffset + delta, maxPan));
      setTargetPan(p);
      return;
    }
  }

  // ✅ Tout est visible → retour au zoom manuel, pan conservé
  const now = Date.now();
const zoomHeldLongEnough = now - this.lastZoomChangeTime > this.minZoomHoldTime;

if (zoomHeldLongEnough) {
  setTargetZoom(this.userZoomLevel);
}

}




updateTransition() {
  if (!this.autoPanZoomEnabled) return;

  const now = Date.now();
  const easingZoom = (this.zoomLevel < this.userZoomLevel && now - this.lastZoomChangeTime > this.minZoomHoldTime)
    ? 0.08  // retour lent au zoom manuel
    : 0.12; // zoom rapide quand on élargit

  const easingPan = 0.12;

  const panDelta  = this.targetPanOffset - this.panOffset;
  const zoomDelta = this.targetZoomLevel - this.zoomLevel;

  const movingPan  = Math.abs(panDelta)  > 0.25;
  const movingZoom = Math.abs(zoomDelta) > 1e-3;

  if (movingPan || movingZoom) {
    this.panOffset += panDelta * easingPan;
    this.zoomLevel += zoomDelta * easingZoom;
    this.initLayout(this.canvasWidth, this.canvasHeight);
  } else {
    this.panOffset = this.targetPanOffset;
    this.zoomLevel = this.targetZoomLevel;
    this.autoPanZoomEnabled = false;
  }
}





}