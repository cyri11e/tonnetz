class Piano {
  constructor(size = 88, canvasWidth, canvasHeight) {
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

  /**
   * Calcule une seule fois les coordonnées/taille de chaque touche
   * et remplit keyLayouts & keyXPositions.
   */
  initLayout(canvasWidth, canvasHeight) {
    const margin    = 20;
    this.yBase      = canvasHeight - margin;

    // Midi total
    const countMidi = this.endMidi - this.startMidi + 1;
    const allMidis  = Array.from(
      { length: countMidi },
      (_, i) => this.startMidi + i
    );

    // Filtre les blanches
    const whiteMidis = allMidis.filter(m => this.keyPattern[m % 12]);
    const numWhite   = whiteMidis.length;

    // Dimensions
    const whiteW = (canvasWidth - margin * 2) / numWhite;
    const whiteH = whiteW * 4;
    const blackW = whiteW - 1;
    const blackH = whiteH ;
    const startX = margin;

    this.whiteKeyHeight = whiteH;
    this.keyLayouts     = [];
    this.keyXPositions  = {};

    // 1) Blanches
    let wc = 0;
    for (const midi of allMidis) {
      const pc = midi % 12;
      if (!this.keyPattern[pc]) continue;

      const x0      = startX + wc * whiteW;
      const w       = whiteW - 1;
      const h       = whiteH;
      const xCenter = x0 + w / 2;

      this.keyLayouts.push({
        midi, type:'white',
        x: x0, y: this.yBase - h,
        w, h,
        keyType: {0:'C',2:'D',4:'E',5:'F',7:'G',9:'A',11:'B'}[pc]
      });
      this.keyXPositions[midi] = xCenter;
      wc++;
    }

    // 2) Noires
    wc = 0;
    for (const midi of allMidis) {
      const pc = midi % 12;
      if (this.keyPattern[pc]) {
        wc++;
        continue;
      }
      const x0      = startX + wc * whiteW;
      const xCenter = x0 - whiteW / 3 + (blackW * 0.67) / 2;

      this.keyLayouts.push({
        midi, type:'black',
        x: x0, y: this.yBase - whiteH,
        w: blackW, h: blackH
      });
      this.keyXPositions[midi] = xCenter;
    }
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
        this.drawWhiteKey(g, key.x, key.y, key.w, key.h, key.keyType, active, root);
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
    // unisson/octave exacte → toujours P8
    label = "P8";
  } else {
    const baseLabel = fallback[semisMod] || "";
    if (octaves > 0) {
      const letterMatch = baseLabel.match(/^[^\d]+/)?.[0] || "";
      const degreeMatch = parseInt(baseLabel.match(/\d+/)?.[0] || "1", 10);
      const fullDegree  = degreeMatch + octaves * 7;
      label = `${letterMatch}${fullDegree} (${baseLabel})`;
    } else {
      label = baseLabel;
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
  drawWhiteKey(g, x, y, w, h, type, isActive, isRoot) {
    g.fill(isRoot ? CONFIG.colors.rootStroke :
           isActive ? CONFIG.colors.playedStroke :
           '#ffffff');
    g.stroke(40);
    g.strokeWeight(1);

    g.beginShape();
    switch(type) {
      case 'C': 
      case 'F': // Forme en L
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
      case 'G':
      case 'A': // Forme en T avec partie haute fine
        g.vertex(x + w/3, y);
        g.vertex(x + w/1.5, y);
        g.vertex(x + w/1.5, y + h * 0.6);
        g.vertex(x + w, y + h * 0.6);
        g.vertex(x + w, y + h);
        g.vertex(x, y + h);
        g.vertex(x, y + h * 0.6);
        g.vertex(x + w/3, y + h * 0.6);
        break;

      default: // Rectangle simple pour le dernier C
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

}