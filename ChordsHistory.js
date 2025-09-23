class ChordsHistory {
  constructor(x, y, w, h) {
    this.zone = {x, y, w, h};
    this.sepX = w;
    this.dragging = false;
    this.bubbles = [];
    this.grid = [];
    this.particles = [];
    this.r = 30;
    this.margin = 10;
    this.bpm = 120; // valeur par défaut
  }

  update() {
    this.zone.w = this.sepX;

    // bulles
    for (let b of this.bubbles) {
      b.update(this.bubbles, this.zone, this.grid);
    }

    // particules
    for (let i=this.particles.length-1; i>=0; i--) {
      this.particles[i].update();
      if (this.particles[i].isDead()) this.particles.splice(i,1);
    }
  }

  display() {
    // debug grid
    this.drawDebugGrid();

    // ligne de séparation
    stroke(this.dragging ? 'orange' : 'grey');
    line(this.sepX, 0, this.sepX, this.zone.h/20);

    // bulles
    for (let b of this.bubbles) b.display();

    // particules
    for (let p of this.particles) p.display();

    // grille
    for (let g of this.grid) {
      noStroke();
      textSize(CONFIG.nodeRadius)
      fill(230); // texte clair
      textAlign(CENTER, CENTER);
      text(g.label, g.x, g.y);
    }

  }

  addRandomChord() {
    let roots = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
    let qualities = ["maj","min","7","m7"];
    let chord = random(roots) + random(qualities);
    this.bubbles.push(new ChordBubble(chord, this.zone, this));
  }

  addChord(chord) {
    if (!chord) return ;
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

  mousePressed(mx,my) {
    if (abs(mx - this.sepX) < 10) {
      this.dragging = true;
    } else {
      // clic sur bulle
      for (let i=this.bubbles.length-1; i>=0; i--) {
        if (this.bubbles[i].isClicked(mx,my)) {
          this.bubbles[i].explode(this.particles);
          this.bubbles.splice(i,1);
          return;
        }
      }
      // clic sur grille
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
  }

  mouseDragged(mx,my) {
    if (this.dragging) {
      this.sepX = constrain(mx, 100, width-100);
      this.updateGrid();
    }
  }

  mouseReleased() { this.dragging = false; }

  explodeAt(x,y,col) {
    for (let i=0;i<30;i++) this.particles.push(new Particle(x,y,col));
  }

  updateGrid() {
    let spacing = this.r*2 + this.margin;
    let cols = max(1, floor(this.zone.w / spacing));
    for (let i=0;i<this.grid.length;i++) {
      let g = this.grid[i];
      let col = i % cols;
      let row = floor(i / cols);
      g.x = this.zone.x + spacing/2 + col*spacing;
      g.y = this.zone.y + this.r + row*spacing;
      g.r = this.r;
    }
  }

  drawDebugGrid() {
    let spacing = this.r*2 + this.margin;
    let cols = max(1, floor(this.zone.w / spacing));
    let rows = ceil(this.grid.length / cols) || 1;
    stroke(80); noFill();
    for (let c=0;c<=cols;c++) {
      let x = this.zone.x + c*spacing;
      line(x, this.zone.y, x, this.zone.y + rows*spacing);
    }
    for (let r=0;r<=rows;r++) {
      let y = this.zone.y + r*spacing;
      line(this.zone.x, y, this.zone.x + this.zone.w, y);
    }
  }
}

class ChordBubble {
  constructor(label, zone, parent) {
    this.label = label;
    this.r = parent.r;
    this.x = zone.x + this.r + 5;
    this.y = zone.y + zone.h - 20;
    this.vy = -map(parent.bpm, 40, 180, 1, 4);
    this.color = color(random(100,255), random(100,255), random(100,255));
    this.parent = parent;

    // paramètres de déformation
    this.deformFreq = 5;   // Hz (oscillations par seconde)
    this.deformAmp = 5;   // % (variation max du ratio L/H)
  }

  update(others, zone, grid) {
    this.y += this.vy;
    this.repel(others);
    this.constrainInside(zone);
    this.checkExplosion(zone, grid);
  }

display() {
  // temps en secondes
  let t = millis() / 1000.0;

  // facteur de déformation
  let ratio = 1 + (this.deformAmp/100) * sin(TWO_PI * this.deformFreq * t);
  let w = this.r * 2 * ratio;
  let h = this.r * 2 / ratio;

  // ellipse contour fin
  noFill();
  stroke(255, 140);
  strokeWeight(0.9);
  ellipse(this.x, this.y, w, h);

  // --- reflet principal : arc sur le bord droit ---
  stroke(255, 180);
  strokeWeight(0.8);
  noFill();
  beginShape();
  for (let a = -PI/8; a <= PI/8; a += 0.05) {
    let px = this.x + (w/2) * cos(a);
    let py = this.y + (h/2) * sin(a);
    vertex(px, py);
  }
  endShape();

  // --- second reflet : petit arc en bas à gauche ---
  stroke(255, 120);
  strokeWeight(0.6);
  noFill();
  beginShape();
  for (let a = PI*0.65; a <= PI*0.95; a += 0.05) {
    let px = this.x + (w/2) * cos(a);
    let py = this.y + (h/2) * sin(a);
    vertex(px, py);
  }
  endShape();

  // texte au centre
  textSize(CONFIG.nodeRadius)
  noStroke();
  fill(230);
  textAlign(CENTER, CENTER);
  text(this.label, this.x, this.y);
}



  // répulsion douce
repel(others) {
  const strength = 0.15;   // force globale (0.1–0.2 = doux)
  const horizBias = 0.83;   // poids horizontal
  const vertBias  = 0.7;   // poids vertical

  for (let o of others) {
    if (o === this) continue;
    let dx = this.x - o.x;
    let dy = this.y - o.y;
    let d  = sqrt(dx*dx + dy*dy);
    let minDist = this.r + o.r;

    if (d > 0 && d < minDist) {
      let overlap = (minDist - d) * strength;

      // normaliser
      dx /= d;
      dy /= d;

      // appliquer biais : plus de déplacement latéral que vertical
      this.x += dx * overlap * horizBias;
      this.y += dy * overlap * vertBias;
    }
  }
}


  constrainInside(zone) {
    this.x = constrain(this.x, zone.x + this.r, zone.x + zone.w - this.r);
  }

  checkExplosion(zone, grid) {
    let spacing = this.r*2 + this.parent.margin;
    let cols = max(1, floor(zone.w / spacing));
    let rows = ceil(grid.length / cols);
    let explosionY = zone.y + rows*spacing + this.r;
    if (this.y - this.r < explosionY) {
      this.explode(this.parent.particles);
      grid.push({ label:this.label, color:this.color, r:this.r });
      this.parent.updateGrid();
      this.parent.bubbles.splice(this.parent.bubbles.indexOf(this),1);
    }
  }

  isClicked(mx,my) {
    return dist(mx,my,this.x,this.y) < this.r;
  }

  explode(particles) {
    for (let i=0;i<30;i++) particles.push(new Particle(this.x,this.y,this.color));
  }
}


// --- Classe Particle ---
class Particle {
  constructor(x, y, col) {
    this.x = x;
    this.y = y;
    this.vx = random(-2, 2);
    this.vy = random(-2, 2);
    this.alpha = 255;
    this.col = col;
    this.size = random(2, 4);
  } 

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.95; // friction
    this.vy *= 0.95;
    this.alpha -= 8; // fade out
  }

  display() {
    
    noFill();
    strokeWeight(0.5)
    stroke(red(this.col), green(this.col), blue(this.col), this.alpha);
    ellipse(this.x, this.y, this.size);
  }

  isDead() {
    return this.alpha <= 0;
  }
}
