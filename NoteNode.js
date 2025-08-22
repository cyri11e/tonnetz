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
    
    // Affichage de la note en deux parties
    g.fill(active ? CONFIG.colors.nodeLabel : CONFIG.colors.inactiveNodeLabel);
    g.noStroke();
    g.textAlign(CENTER, CENTER);
    g.textFont('Arial');
    g.textStyle(BOLD);
    g.textSize(CONFIG.fontSize);

    const letter = this.name[0];  // Première lettre (C, D, E, etc.)
    const accidental = this.name.slice(1);  // Altération (♯ ou ♭)
    
    // Lettre principale centrée
    g.text(letter, this.px, this.py);
    
    // Altération positionnée à "2 heures" avec plus d'espace
    if (accidental) {
      g.textSize(CONFIG.fontSize * 0.75);  // Un peu plus petit
      const angle = -60 * Math.PI / 180;  // 60° (position 2h)
      const radius = CONFIG.fontSize * 0.6;  // Distance augmentée
      const offsetX = Math.cos(angle) * radius;
      const offsetY = Math.sin(angle) * radius;
      g.text(accidental, this.px + offsetX, this.py + offsetY);
    }
    
    g.pop();
  }
}

