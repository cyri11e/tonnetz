class NoteListView {
  constructor({ gamme, tonicPc, style = 'mixed' }) {
    this.gamme = gamme;
    this.tonicPc = tonicPc;
    this.noteStyle = style;
    this.bubbles = []; // pour interaction
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

 for (let i = 0; i < bubbleCount; i++) {
  const isOctave = (i === 12);
  const pc = pcs[i];
  const name = this.gamme.getNoteName(pc) ?? pcToName(pc, tonnetz.noteStyle);
  const degrees = this.gamme.getDegreeLabel(i % 12, tonnetz.noteStyle); // modulo pour l’octave
  const isTonic = pc === this.tonicPc && i % 12 === 0;
  const inGamme = this.gamme.pitchClasses.includes(pc);

  const x = startX + i * spacing;
  const y = baseY;

  // dessin visuel identique
  g.strokeWeight(1);
  g.stroke(CONFIG.colors.inactiveNodeStroke);

  if (isTonic) {
    g.fill(CONFIG.colors.tonicFillLight);
    g.stroke(CONFIG.colors.selectedNodeStroke);
    g.strokeWeight(2);
  } else if (inGamme) {
    g.fill(CONFIG.colors.selectedNodeFill);
    g.stroke(CONFIG.colors.selectedNodeStroke);
    g.strokeWeight(1);
  } else {
    g.noFill();
    g.stroke(CONFIG.colors.inactiveNodeStroke);
  }

  g.circle(x, y, radius * 2);

  g.fill(isTonic ? CONFIG.colors.tonicTextDark : CONFIG.colors.inactiveNodeLabel);
  g.noStroke();
  const letter = name[0];
  const accidental = name.slice(1);
  g.text(letter, x, y);

  if (accidental) {
    g.textSize(radius * 0.75);
    const angle = -60 * Math.PI / 180;
    const r = radius * 0.6;
    g.text(accidental, x + Math.cos(angle) * r, y + Math.sin(angle) * r);
    g.textSize(radius);
  }

  if (degrees) {
    g.textSize(radius * 0.5);
    g.fill(isTonic ? CONFIG.colors.tonicTextDark : CONFIG.colors.inactiveNodeLabel);
    g.text(degrees, x, y + radius * 0.6);
    g.textSize(radius);
  }

  // ⚠️ On n’ajoute pas la bulle octave dans this.bubbles
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
      const pc = bubble.pc;

      // 🔁 Drag & drop : on stocke la bulle glissée
      draggedBubble = bubble;
      dragStartPc = pc;

      // 🎯 Interaction classique : sélection/désélection ou changement de tonique
      if (keyIsDown(SHIFT)) {
        tonnetz.setKey(pcToName(pc));
        if (!tonnetz.gamme.chroma.includes(tonnetz.keyPc)) {
          tonnetz.gamme.ajouter(tonnetz.keyPc);
        }
      } else {
        if (pc === tonnetz.keyPc) return true;
        if (tonnetz.gamme.pitchClasses.includes(pc)) {
          tonnetz.gamme.supprimer(pc);
        } else {
          tonnetz.gamme.ajouter(pc);
        }
      }

      return true;
    }
  }
  return false;
}



  update(gamme, tonicPc, style) {
    this.gamme = gamme;
    this.tonicPc = tonicPc;
    this.noteStyle = style;
  }
}
