class ChordsHistory {
  constructor(x, y, w, h) {
    this.zone = {x, y, w, h};
    this.sepX = w;
    this.sepY = h;
    this.draggingX = false;
    this.draggingY = false;
    this.bubbles = [];
    this.grid = [];
    this.particles = [];
    this.r = 30;
    this.margin = 10;
    this.bpm = 120;
    this.maxGridSize = 0;
    this.lastChordLabel = null;
    this.lastChordCount = 0;


  }

  update() {
    this.zone.w = this.sepX;
    this.zone.h = this.sepY;

    for (let b of this.bubbles) {
      b.update(this.bubbles, this.zone, this.grid);
    }

    for (let i=this.particles.length-1; i>=0; i--) {
      this.particles[i].update();
      if (this.particles[i].isDead()) this.particles.splice(i,1);
    }
  }

  
  display() {
  this.drawDebugGrid();

  // Curseurs de redimensionnement
  stroke(this.draggingX ? 'orange' : 'white');
  line(this.sepX, 0, this.sepX, height);

  stroke(this.draggingY ? 'orange' : 'white');
  line(0, this.sepY, width, this.sepY);

  // Bulles
  for (let b of this.bubbles) b.display();

  // Particules
  for (let p of this.particles) p.display();

  // Accords dans la grille
for (let g of this.grid) {
  noStroke();
  fill(230);
  textAlign(CENTER, CENTER);
  const chordCount = this.lastChordCount > 1 ? 'x'+this.lastChordCount : ''
  text(`${g.label} ${chordCount}`, g.x, g.y);
}


  // BPM
  noStroke(); fill(200);
  textAlign(RIGHT, TOP);
  text("BPM: " + this.bpm, width - 10, 10);


}

addChord(chord) { 
  if (!chord) return; 
  let isDuplicate = (chord === this.lastChordLabel);
  if (isDuplicate) {
    this.lastChordCount++;
    console.log(this.lastChordCount)
  } else {
    this.lastChordLabel = chord;
    this.lastChordCount = 1;
  }
      
  this.bubbles.push(new ChordBubble(chord, this.zone, this, isDuplicate));
  

  }

  addRandomChord(chord = 'Cmaj7') {
    //let roots = ["C","D","Eb","E","F","G","A"];
    //let qualities = ["maj7","min7","7","m7"];
    let roots = ["C"];
    let qualities = ["maj7"];
    //let chord = random(roots) + random(qualities);
    
let isDuplicate = (chord === this.lastChordLabel);
if (isDuplicate) {
  this.lastChordCount++;
  console.log(this.lastChordCount)
} else {
  this.lastChordLabel = chord;
  this.lastChordCount = 1;
}
    
    this.bubbles.push(new ChordBubble(chord, this.zone, this, isDuplicate));
  }

  reset() {
    this.bubbles = [];
    this.grid = [];
    this.particles = [];
    this.lastChordLabel = null;
    this.lastChordCount = 0;
  }

  changeBpm(delta) {
    this.bpm = constrain(this.bpm + delta, 40, 240);
    for (let b of this.bubbles) {
      b.vy = -map(this.bpm, 40, 180, 1, 4);
    }
  }

  mousePressed(mx,my) {
    if (abs(mx - this.sepX) < 10) this.draggingX = true;
    if (abs(my - this.sepY) < 10) this.draggingY = true;

    for (let i=this.bubbles.length-1; i>=0; i--) {
      if (this.bubbles[i].isClicked(mx,my)) {
        this.bubbles[i].explode(this.particles);
        this.bubbles.splice(i,1);
        return;
      }
    }

    for (let i=this.grid.length-1; i>=0; i--) {
      let g = this.grid[i];
      if (dist(mx,my,g.x,g.y) < g.r) {
        this.explodeAt(g.x,g.y,g.color);
        this.grid.splice(i,1);
        this.updateGrid();
        return;
      }
    }
  }

  mouseDragged(mx,my) {
    if (this.draggingX) this.sepX = constrain(mx, this.r*2, width - this.r*2);
    if (this.draggingY) this.sepY = constrain(my, this.r*2, height - this.r*2);
    this.updateGrid();
  }

  mouseReleased() {
    this.draggingX = false;
    this.draggingY = false;
  }

  explodeAt(x,y,col) {
    for (let i=0;i<30;i++) this.particles.push(new Particle(x,y,col));
  }

updateGrid() {
  let spacing = this.r * 2 + this.margin;
  let cols = max(0, floor(this.sepX / spacing));
  let rows = max(0, floor(this.sepY / spacing));
  this.maxGridSize = cols * rows;

  // Purge les éléments en trop si la grille est réduite
  if (this.grid.length > this.maxGridSize) {
    this.grid.splice(this.maxGridSize); // coupe à la taille max
  }

  // Repositionne les éléments restants
  for (let i = 0; i < this.grid.length; i++) {
    let g = this.grid[i];
    let col = i % cols;
    let row = floor(i / cols);
    g.x = this.zone.x + spacing / 2 + col * spacing;
    g.y = this.zone.y + this.r + row * spacing;
    g.r = this.r;
  }
}


  drawDebugGrid() {
    let spacing = this.r*2 + this.margin;
    let cols = max(1, floor(this.sepX / spacing));
    let rows = max(1, floor(this.sepY / spacing));
    stroke(80); noFill();
    for (let r=0; r<rows; r++) {
      for (let c=0; c<cols; c++) {
        let x = this.zone.x + c*spacing;
        let y = this.zone.y + r*spacing;
        rect(x, y, spacing, spacing);
      }
    }
  }
}
