class ChordBubble {
  constructor(label, zone, parent) {
    this.label = label;
    this.r = parent.r;
    this.x = zone.x + this.r + 5;
    this.y = height - 20;

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
  let spacing = this.r * 2 + this.parent.margin;
  let cols = max(1, floor(zone.w / spacing));
  let maxRows = max(1, floor((zone.h - this.r * 2) / spacing));
  let maxItems = cols * maxRows;

  if (grid.length >= maxItems) return;

  let explosionY = zone.y + this.r + maxRows * spacing;
  if (this.y - this.r < explosionY) {
    this.explode(this.parent.particles);
    grid.push({ label: this.label, color: this.color, r: this.r });
    this.parent.updateGrid();
    this.parent.bubbles.splice(this.parent.bubbles.indexOf(this), 1);
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
