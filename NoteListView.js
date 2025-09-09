class NoteListView {
  constructor({ gamme, tonicPc, style = 'mixed' }) {
    this.gamme = gamme;
    this.tonicPc = tonicPc;
    this.noteStyle = style;
    this.bubbles = []; // pour interaction
    this.lastActiveTimes = Array(12).fill(0);
    this.offsetX = 0;
    this.offsetY = 0;
  }

showInterval(g, canvasWidth) {
  const active = Array.from(tonnetz.activePcs ?? []);
  const midiNumbers = tonnetz.activeMidiNums ?? [];
  if (active.length !== 2 || midiNumbers.length !== 2) return;

  const semitones = midiNumbers[1] - midiNumbers[0];
  const [pcA, pcB] = active;
  const bubbleA = this.bubbles.find(b => b.pc === pcA);
  const bubbleB = this.bubbles.find(b => b.pc === pcB);
  if (!bubbleA || !bubbleB) return;

  const nameA = this.gamme.getNoteName(pcA) ?? pcToName(pcA, tonnetz.noteStyle);
  const nameB = this.gamme.getNoteName(pcB) ?? pcToName(pcB, tonnetz.noteStyle);
  const intervalLabel = getIntervalFromNotes(nameA, nameB, semitones);

  const mainColor = getIntervalColor(intervalLabel.replace(/^[-+]/, ""));
  const compColor = mainColor; // même couleur pour complémentaire ici

  const xs = this.bubbles.map(b => b.x);
  const listLeft = Math.min(...xs) - CONFIG.nodeRadius;
  const listRight = Math.max(...xs) + CONFIG.nodeRadius;
  const yMain = bubbleA.y + 20;
  const compWeight = CONFIG.nodeRadius * 0.6;
  g.push();
  g.stroke(mainColor);
  g.fill(mainColor);
  g.strokeWeight(CONFIG.nodeRadius * 0.9);
  g.textAlign(CENTER, CENTER);
  g.textFont(CONFIG.fontFamily);
  g.textStyle(CONFIG.fontWeight);
  g.textSize(CONFIG.fontSize * 0.5);

  if (semitones <= 0) {
    // === Intervalle direct ===

    g.line(bubbleA.x, yMain, bubbleB.x, yMain);
    g.translate((bubbleA.x + bubbleB.x) / 2, yMain);
    g.noStroke();
    g.circle(0, 0, CONFIG.fontSize * 0.9);
    g.fill(CONFIG.colors.bg);
    g.text(intervalLabel, 0, 0);

  } else {
    // === Intervalle complémentaire ===
    g.push();
    // Segment 1 : B → droite
    g.stroke(compColor);
    g.strokeWeight(compWeight);
    g.line(bubbleB.x, yMain, listRight, yMain);
    g.translate((bubbleB.x + listRight) / 2, yMain);
    g.noStroke();
    g.fill(compColor);
    g.circle(0, 0, CONFIG.fontSize * 0.9);
    g.fill(CONFIG.colors.bg);
    g.text(intervalLabel, 0, 0);

    // Segment 2 : gauche → A
    g.stroke(compColor);
    g.strokeWeight(compWeight);
    g.line(listLeft, yMain, bubbleA.x, yMain);
    g.translate((listLeft + bubbleA.x) / 2, yMain);
    g.noStroke();
    g.fill(compColor);
    g.circle(0, 0, CONFIG.fontSize * 0.9);
    g.fill(CONFIG.colors.bg);
    g.text(intervalLabel, 0, 0);
}
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

  const startX = (canvasWidth - totalWidth) / 2 + radius + this.offsetX;
  const baseY = 30 + CONFIG.fontSize * 2.2 + this.offsetY;

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
    //this.showInterval(g);
}



  handleClick(mx, my) {
    for (const bubble of this.bubbles) {
      const dx = mx - bubble.x;
      const dy = my - bubble.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= bubble.radius + 2) {
        const isTonic = bubble.pc === this.tonicPc;
        draggedBubble = bubble;
        dragStartPc = bubble.pc;
        draggedBubble.isDragTonic = isTonic;
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
    
    // Si c'est un clic statique (pas de déplacement significatif)
    if (dist <= 2) {
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
      return true;
    }
    
    // Si c'est un déplacement
    if (draggedBubble.isDragTonic) {
      // Si c'est la tonique ou l'octave, on ne fait rien (le déplacement sera géré ailleurs)
      draggedBubble = null;
      return true;
    } else {
      // Pour les autres notes, on cherche une bulle cible pour l'échange
      for (const target of this.bubbles) {
        const dx = mx - target.x;
        const dy = my - target.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= target.radius + 2 && target.pc !== dragStartPc) {
          // On retire l'ancienne note si elle était dans la gamme
          if (this.gamme.pitchClasses.includes(dragStartPc)) {
            this.gamme.supprimer(dragStartPc);
          }
          // On ajoute la nouvelle note si elle n'y était pas déjà
          if (!this.gamme.pitchClasses.includes(target.pc)) {
            this.gamme.ajouter(target.pc);
          }
          break;
        }
      }
    }
    draggedBubble = null;
    return true;
  }

  update(gamme, tonicPc, style) {
    this.gamme = gamme;
    this.tonicPc = tonicPc;
    this.noteStyle = style;
  }
}
