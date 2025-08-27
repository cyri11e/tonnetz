// NoteNode — utilisé par : Tonnetz
class NoteNode {
  constructor(i, j, origin, startPc) {
    this.i = i;
    this.j = j;
    this.xu = U.x * i + V.x * j; // U, V depuis helpers.js
    this.yu = U.y * i + V.y * j;
    this.px = origin.x + CONFIG.unitX * this.xu;
    this.py = origin.y - CONFIG.unitY * this.yu;
    this.pc = mod12(startPc + this.xu); // mod12 depuis helpers.js
    this.name = pcToName(this.pc);      // pcToName depuis helpers.js
    this.manualSelected = false;
    this.lastActiveTime = 0;
  }

  isActive(selectedPcs) {
    return this.manualSelected || selectedPcs.has(this.pc);
  }

  contains(mx, my) {
    const dx = mx - this.px, dy = my - this.py;
    return Math.hypot(dx, dy) <= CONFIG.nodeRadius + 2;
  }

// On passe maintenant isRoot en paramètre pour éviter la dépendance globale à tonnetz
// Ajout d'un paramètre inGamme (booléen) pour afficher la pastille grise si la note est dans la gamme
draw(g, active, isTonic, isRoot, inGamme, zoom) {
  // Met à jour le timestamp si la note est activée
  if (active) this.lastActiveTime = millis();
  const fadeFactor = getFadeFactor(this.lastActiveTime);

  const letter     = this.name[0];
  const accidental = this.name.slice(1);
  const radius     = CONFIG.nodeRadius * zoom;

  // --- Cercle de base ---
  g.push();
  g.translate(this.px, this.py);
  g.strokeWeight(1);
  g.stroke(CONFIG.colors.inactiveNodeStroke);

  if (isTonic) {
    g.fill(CONFIG.colors.tonicFillLight);
  } else if (inGamme) {
    g.fill(CONFIG.colors.selectedNodeFill);
  } else {
    g.noFill();
  }
  g.circle(0, 0, radius * 2);

  // --- Texte principal ---
  g.textAlign(CENTER, CENTER);
  g.textFont(CONFIG.fontFamily);
  g.textStyle(CONFIG.fontWeight);
  g.textSize(CONFIG.fontSize * zoom);
  g.noStroke();
  g.fill(isTonic ? CONFIG.colors.tonicTextDark : CONFIG.colors.inactiveNodeLabel);
  g.text(letter, 0, 0);

  if (accidental) {
    g.textSize(CONFIG.fontSize * 0.75 * zoom);
    const angle = -60 * Math.PI / 180;
    const r = CONFIG.fontSize * 0.6 * zoom;
    g.text(accidental, Math.cos(angle) * r, Math.sin(angle) * r);
  }
  g.pop();

  // --- Highlight dynamique ---
  if (active || fadeFactor > 0) {
    // 1) Pastille de fond pour notes hors gamme jouées
    if (active && !inGamme) {
      g.push();
      g.translate(this.px, this.py);
      const bg = g.color(CONFIG.colors.bg);
      bg.setAlpha(255 * fadeFactor);
      g.noStroke();
      g.fill(bg);
      g.circle(0, 0, radius * 2);
      g.pop();
    }

    // 2) Cercle de contour animé
    g.push();
    g.translate(this.px, this.py);
    g.noFill();
    g.strokeWeight(active ? 3.2 * zoom : 1 * zoom);
    const baseColor = isRoot ? CONFIG.colors.rootStroke : CONFIG.colors.playedStroke;
    const c = g.color(baseColor);
    c.setAlpha(255 * fadeFactor);
    g.stroke(c);
    g.circle(0, 0, radius * 2);

    // 3) Texte réaffiché au-dessus
    const labelColor = g.color(CONFIG.colors.nodeLabel);
    labelColor.setAlpha(255 * fadeFactor);
    g.fill(labelColor);
    g.noStroke();
    g.textAlign(CENTER, CENTER);
    g.textFont(CONFIG.fontFamily);
    g.textStyle(CONFIG.fontWeight);
    g.textSize(CONFIG.fontSize * zoom);
    g.text(letter, 0, 0);
    if (accidental) {
      g.textSize(CONFIG.fontSize * 0.75 * zoom);
      const angle = -60 * Math.PI / 180;
      const r = CONFIG.fontSize * 0.6 * zoom;
      g.text(accidental, Math.cos(angle) * r, Math.sin(angle) * r);
    }
    g.pop();
  }
}


}
