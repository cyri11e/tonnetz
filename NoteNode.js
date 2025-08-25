class NoteNode {
  constructor(i, j, origin, startPc) {
    this.i = i;
    this.j = j;
    this.xu = U.x * i + V.x * j;
    this.yu = U.y * i + V.y * j;
    this.px = origin.x + CONFIG.unitX * this.xu;
    this.py = origin.y - CONFIG.unitY * this.yu;
    this.pc = mod12(startPc + this.xu);
    this.name = pcToName(this.pc);
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

draw(g, active, isTonic) {
  if (active) this.lastActiveTime = millis();
  const fadeFactor = getFadeFactor(this.lastActiveTime);

  const letter = this.name[0];
  const accidental = this.name.slice(1);

  g.push();
  g.translate(this.px, this.py);

  // --- Cercle de base ---
  g.strokeWeight(1);
  g.stroke(CONFIG.colors.inactiveNodeStroke);

  if (isTonic) {
    g.fill('#5b5b5bff'); // fond clair pour la tonique
  } else {
    g.noFill();
  }

  g.circle(0, 0, CONFIG.nodeRadius * 2);

  // --- Texte ---
  g.textAlign(CENTER, CENTER);
  g.textFont('Arial');
  g.textStyle(BOLD);
  g.textSize(CONFIG.fontSize);
  g.noStroke();
  g.fill(isTonic ? '#0f0f10' : CONFIG.colors.inactiveNodeLabel); // texte sombre si tonique
  g.text(letter, 0, 0);

  if (accidental) {
    g.textSize(CONFIG.fontSize * 0.75);
    const angle = -60 * Math.PI / 180;
    const radius = CONFIG.fontSize * 0.6;
    g.text(accidental, Math.cos(angle) * radius, Math.sin(angle) * radius);
  }

  g.pop();

  // --- Highlight dynamique ---
  if (active || fadeFactor > 0) {
    g.push();
    g.translate(this.px, this.py);
    g.noFill();
    g.strokeWeight(active ? 3.2 : 1);
    const isRoot = active && tonnetz.isRoot(this);
    const baseColor = isRoot ? CONFIG.colors.selectedStroke : CONFIG.colors.selectedStroke;
    const c = g.color(baseColor);
    c.setAlpha(255 * fadeFactor);
    g.stroke(c);
    g.circle(0, 0, CONFIG.nodeRadius * 2);

    const labelColor = g.color(CONFIG.colors.nodeLabel);
    labelColor.setAlpha(255 * fadeFactor);
    g.fill(labelColor);
    g.noStroke();
    g.textAlign(CENTER, CENTER);
    g.textFont('Arial');
    g.textStyle(BOLD);
    g.textSize(CONFIG.fontSize);
    g.text(letter, 0, 0);
    if (accidental) {
      g.textSize(CONFIG.fontSize * 0.75);
      const angle = -60 * Math.PI / 180;
      const radius = CONFIG.fontSize * 0.6;
      g.text(accidental, Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    g.pop();
  }
}


}
