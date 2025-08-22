class NoteNode {
  constructor(i, j, origin, startPc) {
    this.i = i;
    this.j = j;
    // Coordonnées en unités logiques
    this.xu = U.x * i + V.x * j;
    this.yu = U.y * i + V.y * j;

    // Coordonnées pixels (Y vers le bas)
    this.px = origin.x + CONFIG.unitX * this.xu;
    this.py = origin.y - CONFIG.unitY * this.yu;

    // Pitch class
    this.pc = mod12(startPc + this.xu);
    this.name = pcToName(this.pc);

    // État
    this.manualSelected = false;
  }

  isActive(selectedPcs) {
    return this.manualSelected || selectedPcs.has(this.pc);
  }

  contains(mx, my) {
    const dx = mx - this.px, dy = my - this.py;
    return Math.hypot(dx, dy) <= CONFIG.nodeRadius + 2;
  }

  draw(g, active) {
    g.push();
    g.noFill();
    g.strokeWeight(active ? 3.2 : 1);
    const isRoot = active && tonnetz.isRoot(this);
    g.stroke(isRoot ? CONFIG.colors.rootStroke : 
             active ? CONFIG.colors.selectedStroke : 
             CONFIG.colors.inactiveNodeStroke);
    g.circle(this.px, this.py, CONFIG.nodeRadius * 2);
    g.fill(active ? CONFIG.colors.nodeLabel : CONFIG.colors.inactiveNodeLabel);
    g.noStroke();
    g.textAlign(CENTER, CENTER);
    g.textFont('Arial');
    g.textStyle(BOLD);
    g.textSize(CONFIG.fontSize);
    g.text(this.name, this.px, this.py);
    g.pop();
  }
}
