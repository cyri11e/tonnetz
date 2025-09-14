// Classe de base pour toute zone interactive.
// Fournit un contrat minimal: callbacks, état de survol, API contains/drawDebug.
class InteractionZone {
  constructor(name) {
    // Nom lisible pour debug et affichage
    this.name = name;

    // État de survol (mis à jour par InteractionManager dans hover)
    this.isHovered = false;

    // Callbacks d’interaction (optionnels, définis par le composant)
    this.onClick = null;   // (mx, my, data) → clic (bouton/shift dans data)
    this.onRelease = null; // (mx, my, data) → relâchement
    this.onDrag = null;    // (mx, my, data) → déplacement avec bouton enfoncé
    this.onHover = null;   // (mx, my, data) → survol
    this.onWheel = null;   // (mx, my, data) → molette (delta dans data)

    // Callback de synchronisation, appelée par InteractionManager
    // pour réaligner la zone avec l’état visuel du composant
    // (ex: position, taille, échelle) à la fin de l’interaction.
    this.syncCallback = null;
  }

  // Doit être surchargée: renvoie true si (mx,my) est dans la zone.
  contains(mx, my) { return false; }

  // Option de debug visuel: surchargée par chaque type pour dessiner la hitbox.
  drawDebug() {}
}



// Zone circulaire (disque plein).
class CircleZone extends InteractionZone {
  constructor(x, y, r, name) {
    super(name);
    // Géométrie de la zone sensible (coords en pixels, rayon en pixels)
    this.x = x;
    this.y = y;
    this.r = r;
  }

  // Test d’appartenance: distance point-centre <= rayon
  contains(mx, my) {
    const dx = mx - this.x;
    const dy = my - this.y;
    return (dx * dx + dy * dy) <= (this.r * this.r);
  }

  // Dessin de debug: disque semi-transparent + libellé
  drawDebug() {
    push();
    stroke(0);
    fill(this.isHovered ? 'rgba(0,255,0,0.25)' : 'rgba(255,0,0,0.18)');
    ellipse(this.x, this.y, this.r * 2);
    noStroke();
    fill(10);
    textAlign(CENTER, CENTER);
    text(this.name, this.x, this.y);
    pop();
  }
}



// Zone rectangulaire alignée aux axes.
class RectZone extends InteractionZone {
  constructor(x, y, w, h, name) {
    super(name);
    // x, y: coin supérieur gauche; w, h: largeur/hauteur
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  // Test d’appartenance: inclusion AABB
  contains(mx, my) {
    return (
      mx >= this.x && mx <= this.x + this.w &&
      my >= this.y && my <= this.y + this.h
    );
  }

  // Dessin de debug: rectangle semi-transparent + libellé
  drawDebug() {
    push();
    stroke(0);
    fill(this.isHovered ? 'rgba(0,255,0,0.25)' : 'rgba(0,0,255,0.18)');
    rect(this.x, this.y, this.w, this.h);
    noStroke();
    fill(10);
    textAlign(CENTER, CENTER);
    text(this.name, this.x + this.w / 2, this.y + this.h / 2);
    pop();
  }
}



// Zone annulaire (entre deux rayons concentriques).
class RingZone extends InteractionZone {
  constructor(x, y, innerR, outerR, name) {
    super(name);
    // Centre (x,y), rayon interne (exclu) et rayon externe (inclus)
    this.x = x;
    this.y = y;
    this.innerR = innerR;
    this.outerR = outerR;
  }

  // Test d’appartenance: distance comprise entre [innerR, outerR]
  contains(mx, my) {
    const dx = mx - this.x;
    const dy = my - this.y;
    const d2 = dx * dx + dy * dy;
    return d2 >= this.innerR * this.innerR && d2 <= this.outerR * this.outerR;
  }

  // Dessin de debug: disque externe - disque interne + libellé
  drawDebug() {
    push();
    noStroke();
    fill(this.isHovered ? 'rgba(0,255,0,0.25)' : 'rgba(255,215,0,0.18)');
    ellipse(this.x, this.y, this.outerR * 2);
    // "percer" l’anneau visuellement
    fill(245);
    ellipse(this.x, this.y, this.innerR * 2);
    fill(10);
    textAlign(CENTER, CENTER);
    text(this.name, this.x, this.y);
    pop();
  }
}
