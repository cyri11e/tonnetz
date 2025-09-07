class NoteListView {
  constructor({ gamme, tonicPc, style = 'mixed' }) {
    this.gamme = gamme;
    this.tonicPc = tonicPc;
    this.noteStyle = style;
    this.bubbles = []; // pour interaction
    this.lastActiveTimes = Array(12).fill(0);

  }

draw(g, canvasWidth) {
  if (!this.gamme || !Array.isArray(this.gamme.pitchClasses)) return;

  const pcs = [...Array(12).keys()].map(i => mod12(this.tonicPc + i));
  pcs.push(this.tonicPc); // tonique à l’octave

  const bubbleCount = pcs.length;
  const targetWidth = canvasWidth * 0.9;

  let radius = CONFIG.nodeRadius;
  let spacing = radius * 2.1;
  let totalWidth = spacing * bubbleCount;

  if (totalWidth > targetWidth) {
    const scaleFactor = targetWidth / totalWidth;
    radius *= scaleFactor;
    spacing = radius * 2.1;
    totalWidth = spacing * bubbleCount;
  }

  const startX = (canvasWidth - totalWidth) / 2 + radius;
  const baseY = 30 + CONFIG.fontSize * 2.2;

  g.push();
  g.textAlign(CENTER, CENTER);
  g.textFont(CONFIG.fontFamily);
  g.textStyle(CONFIG.fontWeight);
  g.textSize(radius);

  // Ligne de fond
  g.strokeCap(ROUND);
  const bgColor = g.color(CONFIG.colors.bg);
  bgColor.setAlpha(200);
  g.fill(bgColor);
  g.stroke(CONFIG.colors.bg);
  g.strokeWeight(radius * 2.6);
  g.line(startX, baseY, startX + (bubbleCount - 1) * spacing, baseY);
  g.noStroke();

  // Ombre
  const shadowColor = g.color(0, 0, 0, 50);
  const shadowOffset = 2;
  for (let i = 0; i < 3; i++) {
    g.stroke(shadowColor);
    g.strokeWeight(radius * 2.6 + i * 2);
    g.line(startX, baseY + shadowOffset + i, startX + (bubbleCount - 1) * spacing, baseY + shadowOffset + i);
  }

  this.bubbles = [];

  const now = millis?.() ?? performance.now();
  const inScaleSet = new Set(this.gamme.pitchClasses ?? []);
  const activeSet = new Set(tonnetz.activePcs ?? []);
  const chords = tonnetz.getDetectedChords?.() ?? [];
  const rootPc = chords.length ? nameToPc(chords[0].root) : -1;

  for (let i = 0; i < bubbleCount; i++) {
    const isOctave = (i === 12);
    const pc = pcs[i];
    const relIndex = mod12(pc - this.tonicPc);

    const name = this.gamme.getNoteName(pc) ?? pcToName(pc, tonnetz.noteStyle);
    const degrees = this.gamme.getDegreeLabel(i % 12, tonnetz.noteStyle);
    const isTonic = pc === this.tonicPc && i % 12 === 0;
    const inGamme = inScaleSet.has(pc);
    const isActive = activeSet.has(pc);
    const isRoot = rootPc !== -1 && pc === rootPc;

    this.lastActiveTimes ??= Array(12).fill(0);
    if (isActive) this.lastActiveTimes[pc] = now;

    const fadeFactor = (() => {
      const t = this.lastActiveTimes?.[pc];
      if (!t) return 0;
      const dt = now - t;
      const decay = 900;
      return constrain(1 - dt / decay, 0, 1);
    })();

    const x = startX + i * spacing;
    const y = baseY;

const COLOR_INDEX_TO_QUINTE_INDEX = [
  0,  // couleur 0 → quinteIndex 0
  6,  // 1 → 6
  10, // 2 → 10
  2,  // 3 → 2
  8,  // 4 → 8
  4,  // 5 → 4
  11, // 6 → 11
  1,  // 7 → 1
  7,  // 8 → 7
  3,  // 9 → 3
  9,  // 10 → 9
  5   // 11 → 5
];


    // Couleur de fond
const colorIndex = COLOR_INDEX_TO_QUINTE_INDEX[i % 12];
const noteColor = color(CONFIG.colors.noteColors[colorIndex]);

    noteColor.setAlpha(isActive ?  220 : 80);
    if (inGamme) {
        g.fill(noteColor);
    } else {        
        g.noFill(); 
    }



    // Contour (équivalent des arcs du COF)
    const strokeColor =
      isRoot && isActive ? CONFIG.colors.rootStroke :
      isActive ? CONFIG.colors.playedStroke :
      inGamme  ? CONFIG.colors.selectedNodeStroke :
                 CONFIG.colors.inactiveNodeStroke;

    const outlineWeight = radius * ((relIndex === 0) ? 0.08 : 0.04) * (isActive ? 3 : 1);
// if (inGamme) {
//   const glowColor = color(CONFIG.colors.selectedNodeStroke);
//   glowColor.setAlpha(100 + fadeFactor * 80); // lumière douce, modulée par activité

//   g.noFill();
//   g.stroke(glowColor);
//   g.strokeWeight(outlineWeight * 2);

//   // Simule un halo lumineux sous la pastille
//   drawingContext.save();
//   drawingContext.shadowBlur = radius * 3.8;
//   drawingContext.shadowColor = glowColor.toString();
//   g.circle(x, y, radius * 2.3); // légèrement plus grand que la pastille
//   drawingContext.restore();
// }

    // push();
    // drawingContext.filter = 'blur(30px)'; // rayon du flou
    // let bg = color('red');
    //     bg.setAlpha(85); // opacité de l’ombre
    // noFill();
    // stroke(bg)
    // strokeWeight(outlineWeight * 2.6);
    // ellipse(x, y, this.radius * 2.3);
    // drawingContext.filter = 'none';
    // pop();

    g.stroke(strokeColor);
    g.strokeWeight(outlineWeight);
    g.circle(x, y, radius * 2);

    // Texte
    const letter = name[0];
    const accidental = name.slice(1);

    // Couche de base
    let labelColor = color(inGamme ? CONFIG.colors.nodeLabel : CONFIG.colors.inactiveNodeLabel);
    labelColor.setAlpha(inGamme ? 185 : 80);
    g.fill(labelColor);
    g.noStroke();
    g.textSize(radius);
    g.text(letter, x, y);

    if (accidental) {
      g.textSize(radius * 0.75);
      const angle = -60 * Math.PI / 180;
      const r = radius * 0.6;
      g.text(accidental, x + Math.cos(angle) * r, y + Math.sin(angle) * r);
    }

    if (degrees) {
      g.textSize(radius * 0.5);
      g.fill(labelColor);
      g.text(degrees, x, y + radius * 0.6);
    }

    // Highlight (fade dynamique)
    if (fadeFactor > 0) {
      labelColor = color(CONFIG.colors.nodeLabel);
      labelColor.setAlpha(255 * fadeFactor);
      g.fill(labelColor);
      g.textSize(radius);
      g.text(letter, x, y);

      if (accidental) {
        g.textSize(radius * 0.75);
        const angle = -60 * Math.PI / 180;
        const r = radius * 0.6;
        g.text(accidental, x + Math.cos(angle) * r, y + Math.sin(angle) * r);
      }

      if (degrees) {
        g.textSize(radius * 0.5);
        g.text(degrees, x, y + radius * 0.6);
      }
    }

    if (!isOctave) {
      this.bubbles.push({ x, y, radius, pc });
    }
  }

  g.pop();
}



handleClick(mx, my) {
  for (const bubble of this.bubbles) {
    const dx = mx - bubble.x;
    const dy = my - bubble.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= bubble.radius + 2) {
      draggedBubble = bubble;
      dragStartPc = bubble.pc;
      return true;
    }
  }
  return false;
}

handleRelease(mx, my) {
  if (!draggedBubble) return false;

  const dx = mx - draggedBubble.x;
  const dy = my - draggedBubble.y;
  const dist = Math.hypot(dx, dy);
  if (dist > draggedBubble.radius + 2) {
    draggedBubble = null;
    return false;
  }

  const pc = draggedBubble.pc;

  if (keyIsDown(SHIFT)) {
    tonnetz.setKey(pcToName(pc));
    if (!tonnetz.gamme.chroma.includes(tonnetz.keyPc)) {
      tonnetz.gamme.ajouter(tonnetz.keyPc);
    }
  } else {
    if (pc !== tonnetz.keyPc) {
      if (tonnetz.gamme.pitchClasses.includes(pc)) {
        tonnetz.gamme.supprimer(pc);
      } else {
        tonnetz.gamme.ajouter(pc);
      }
    }
  }

  draggedBubble = null;
  return true; // ← bloque la propagation
}





  update(gamme, tonicPc, style) {
    this.gamme = gamme;
    this.tonicPc = tonicPc;
    this.noteStyle = style;
  }
}
