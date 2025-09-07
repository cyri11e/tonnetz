class NoteListView {
  constructor({ gamme, tonicPc, style = 'mixed' }) {
    this.gamme = gamme;
    this.tonicPc = tonicPc;
    this.noteStyle = style;
    this.bubbles = []; // pour interaction
    this.lastActiveTimes = Array(12).fill(0);

  }

// Affiche un seul intervalle choisi parmi les 3 notes actives (hack triangle).
// - Intervalle direct: ligne entre deux bulles (A → B)
// - Complémentaire: deux segments au même niveau, limités aux extrémités de la note list
// - Le label du complémentaire est calculé à l'envers: getIntervalFromNotes(B, A)
showInterval(g, canvasWidth) {
  const active = Array.from(tonnetz.activePcs ?? []);
  if (active.length !== 3) return;

  // 1) Choisir n'importe quel intervalle valide: on prend les deux premières bulles trouvées
  const bubblesByPc = new Map(this.bubbles.map(b => [b.pc, b]));
  const candidates = active.map(pc => bubblesByPc.get(pc)).filter(Boolean);
  if (candidates.length < 2) return;

  // Prendre les deux premières et ordonner visuellement (A à gauche, B à droite)
  let [bubbleA, bubbleB] = candidates.slice(0, 2);
  if (bubbleA.x > bubbleB.x) [bubbleA, bubbleB] = [bubbleB, bubbleA];

  const pcA = bubbleA.pc;
  const pcB = bubbleB.pc;

  // 2) Bornes horizontales du composant = extrémités du note list (pas la largeur d'écran)
  //    On se base sur les bulles visibles pour déterminer les limites.
  const xs = this.bubbles.map(b => b.x);
  const radii = this.bubbles.map(b => b.radius);
  const listLeft = Math.min(...xs) - (radii[0] ?? CONFIG.nodeRadius);
  const listRight = Math.max(...xs) + (radii[0] ?? CONFIG.nodeRadius);

  // 3) Position verticale (même niveau pour direct et complémentaire)
  const yMain = bubbleA.y + 40;

  // 4) Libellés des intervalles (mêmes règles que les bulles)
  const nameA = this.gamme.getNoteName(pcA) ?? pcToName(pcA, tonnetz.noteStyle);
  const nameB = this.gamme.getNoteName(pcB) ?? pcToName(pcB, tonnetz.noteStyle);
  const mainLabel = getIntervalFromNotes(nameA, nameB);   // A → B
  const compLabel = getIntervalFromNotes(nameB, nameA);   // B → A (complémentaire)

  // 5) Couleur (COF) cohérente avec les bulles, basée sur pcA
  const INTERVAL_INDEX = {
  "P1": 0, "P8": 0,
  "P5": 1,
  "M2": 2, "d3": 2,
  "m7": 3, "A6": 3,
  "M3": 4, "d4": 4,
  "m6": 5, "A5": 5,
  "M6": 6, "d7": 6,
  "m3": 7, "A2": 7,
  "TT": 8, "A4": 8, "d5": 8,
  "m2": 9, "A1": 9,
  "M7": 10, "d8": 10,
  "P4": 11
};

let colorIndex = INTERVAL_INDEX[mainLabel.replace(/^[-+]/, "")] ?? 0;
let bandColor = color(CONFIG.colors.noteColors[colorIndex]);



  // 6) Dessin intervalle direct (ligne entre A et B)
  g.stroke(bandColor);
  g.strokeWeight(CONFIG.nodeRadius * 0.9);
  g.line(bubbleA.x, yMain, bubbleB.x, yMain);

  // Pastille centrale (direct)
  g.push();
  g.translate((bubbleA.x + bubbleB.x) / 2, yMain);
  g.textAlign(CENTER, CENTER);
  g.textFont(CONFIG.fontFamily);
  g.textStyle(CONFIG.fontWeight);
  g.textSize(CONFIG.fontSize * 0.5);
  g.noStroke();
  g.fill(bandColor);
  g.circle(0, 0, CONFIG.fontSize * 0.9);
  g.fill(CONFIG.colors.bg);
  g.text(mainLabel, 0, 0);
  g.pop();

  // 7) Dessin intervalle complémentaire (même niveau), limité aux extrémités de la note list
  const compWeight = CONFIG.nodeRadius * 0.6;

  colorIndex = INTERVAL_INDEX[compLabel.replace(/^[-+]/, "")] ?? 0;
  bandColor = color(CONFIG.colors.noteColors[colorIndex]);
  // Segment 1: de B vers la droite (jusqu'à l'extrémité de la note list)
  g.stroke(bandColor);
  g.strokeWeight(compWeight);
  g.line(bubbleB.x, yMain, listRight, yMain);

  // Pastille segment 1 (complémentaire)
  g.push();
  g.translate((bubbleB.x + listRight) / 2, yMain);
  g.textAlign(CENTER, CENTER);
  g.textFont(CONFIG.fontFamily);
  g.textStyle(CONFIG.fontWeight);
  g.textSize(CONFIG.fontSize * 0.5);
  g.noStroke();
  g.fill(bandColor);
  g.circle(0, 0, CONFIG.fontSize * 0.9);
  g.fill(CONFIG.colors.bg);
  g.text(compLabel, 0, 0);
  g.pop();

  // Segment 2: de la gauche (extrémité) vers A
  g.stroke(bandColor);
  g.strokeWeight(compWeight);
  g.line(listLeft, yMain, bubbleA.x, yMain);

  // Pastille segment 2 (complémentaire)
  g.push();
  g.translate((listLeft + bubbleA.x) / 2, yMain);
  g.textAlign(CENTER, CENTER);
  g.textFont(CONFIG.fontFamily);
  g.textStyle(CONFIG.fontWeight);
  g.textSize(CONFIG.fontSize * 0.5);
  g.noStroke();
  g.fill(bandColor);
  g.circle(0, 0, CONFIG.fontSize * 0.9);
  g.fill(CONFIG.colors.bg);
  g.text(compLabel, 0, 0);
  g.pop();
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


    // Couleur de fond
    const QUINTE_INDEX = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
    const colorIndex = QUINTE_INDEX[i % 12];
    const noteColor = color(CONFIG.colors.noteColors[colorIndex]);

    noteColor.setAlpha(isActive ?  220 : CONFIG.inactiveNoteBgalpha);
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
    this.showInterval(g);
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
