class ChordsHistory {
constructor(x, y) {
  const r = 30;
  const margin = 10;
  const spacing = r * 2 + margin;

  const cols = 2;
  const rows = 2;

  const w = cols * spacing;
  const h = rows * spacing + r * 2;

  this.zone = { x, y, w, h };
  this.resizeHandleSize = 20;
  this.resizing = false;
  this.bubbles = [];
  this.grid = [];
  this.particles = [];
  this.r = r;
  this.margin = margin;
  this.bpm = 120;
}


  update() {
    for (let b of this.bubbles) {
      b.update(this.bubbles, this.zone, this.grid);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].isDead()) this.particles.splice(i, 1);
    }
  }

  display() {
    this.drawDebugGrid();

    for (let b of this.bubbles) b.display();
    for (let p of this.particles) p.display();

    for (let g of this.grid) {
      noStroke();
      textSize(CONFIG.nodeRadius);
      fill(230);
      textAlign(CENTER, CENTER);
      text(g.label, g.x, g.y);
    }

    // coin de redimensionnement
// coin de redimensionnement discret

translate(this.zone.x + this.zone.w, this.zone.y + this.zone.h);
noStroke();
fill(this.resizing ? 'orange' : 'rgba(150,150,150,0.3)');
beginShape();
vertex(-this.resizeHandleSize, 0);
vertex(0, -this.resizeHandleSize);
vertex(0, 0);
endShape(CLOSE);


  }

  addRandomChord() {
    let roots = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    let qualities = ["maj", "min", "7", "m7"];
    let chord = random(roots) + random(qualities);
    this.bubbles.push(new ChordBubble(chord, this.zone, this));
  }

  addChord(chord) {
    if (!chord) return;
    this.bubbles.push(new ChordBubble(chord, this.zone, this));
  }

  reset() {
    this.bubbles = [];
    this.grid = [];
    this.particles = [];
  }

  changeBpm(delta) {
    this.bpm = constrain(this.bpm + delta, 40, 240);
    for (let b of this.bubbles) {
      b.vy = -map(this.bpm, 40, 180, 1, 4);
    }
  }

  mousePressed(mx, my) {
    let rx = this.zone.x + this.zone.w - this.resizeHandleSize;
    let ry = this.zone.y + this.zone.h - this.resizeHandleSize;
    if (mx > rx && my > ry) {
      this.resizing = true;
      return;
    }

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      if (this.bubbles[i].isClicked(mx, my)) {
        this.bubbles[i].explode(this.particles);
        this.bubbles.splice(i, 1);
        return;
      }
    }

    for (let i = this.grid.length - 1; i >= 0; i--) {
      let g = this.grid[i];
      if (dist(mx, my, g.x, g.y) < g.r) {
        this.explodeAt(g.x, g.y, g.color);
        this.grid.splice(i, 1);
        this.updateGrid();
        return;
      }
    }
  }

  mouseDragged(mx, my) {
    if (this.resizing) {
      this.zone.w = constrain(mx - this.zone.x, 100, width - this.zone.x);
      this.zone.h = constrain(my - this.zone.y, 100, height - this.zone.y);
      this.updateGrid();
    }
  }

  mouseReleased() {
    this.resizing = false;
  }

  explodeAt(x, y, col) {
    for (let i = 0; i < 30; i++) this.particles.push(new Particle(x, y, col));
  }

updateGrid() {
  let spacing = this.r * 2 + this.margin;
  let cols = max(1, floor(this.zone.w / spacing));

  // 🧠 Limite stricte : on ne garde que les lignes qui tiennent entièrement dans zone.h
  let availableHeight = this.zone.h - this.r * 2; // marge haute + bulle
  let maxRows = floor(availableHeight / spacing); // PAS de ceil → pas de ligne partielle
  let maxItems = cols * maxRows;

  // 🔥 Purge des éléments hors grille
  if (this.grid.length > maxItems) {
    this.grid.splice(maxItems);
  }

  for (let i = 0; i < this.grid.length; i++) {
    let col = i % cols;
    let row = floor(i / cols);
    let g = this.grid[i];
    g.x = this.zone.x + spacing / 2 + col * spacing;
    g.y = this.zone.y + this.r + row * spacing;
    g.r = this.r;
  }
}



drawDebugGrid() {
  let spacing = this.r * 2 + this.margin;
  let cols = max(1, floor(this.zone.w / spacing));
  let maxRows = floor((this.zone.h - this.r * 2) / spacing); // lignes entières uniquement

  stroke(80);
  noFill();

  for (let c = 0; c <= cols; c++) {
    let x = this.zone.x + c * spacing;
    line(x, this.zone.y, x, this.zone.y + maxRows * spacing);
  }

  for (let r = 0; r <= maxRows; r++) {
    let y = this.zone.y + r * spacing;
    line(this.zone.x, y, this.zone.x + this.zone.w, y);
  }
}

}
