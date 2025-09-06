class CircleOfFifths {
  constructor(tonnetz, config = CONFIG) {
    this.tonnetz = tonnetz;
    this.CONFIG = config;
    this.hide = true;
    // Coquille vide: 12 chromas relatifs (ordre des quintes relatifs)
    this.relOrder = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];

    // Géométrie
    this.center = { x: 0, y: 0 };
    this.radius = 0;
    this.ringThickness = Math.max(18, Math.floor(this.CONFIG.nodeRadius * 3));
    this.labelRadiusFactor = 0.82;
    this.rotation = -HALF_PI; // 12h = relChroma 0 en haut

    // Drag/rotation
    this.isDraggingRing = false;
    this.dragStartAngle = 0;
    this.rotationAtDragStart = 0;

    // Pré-calcul des positions angulaires (sans dépendance aux noms)
    this.positions = []; // [{relChroma, angle, px, py, lpx, lpy}]
    this.lastActiveTimes = Array(12).fill(0); // un timestamp par pitch class

  }

  // Dimensions et positions (appel au setup + resize)
build() {
  const d = Math.floor(0.5 * Math.min(width, height)); // 50% de la plus petite dimension
  this.radius = d / 2;
  this.center.x = width / 2;
  this.center.y = height / 2;

  // Taille des pastilles proportionnelle au rayon du grand cercle
  this.ringThickness = this.radius * 0.40; // 18% du rayon, à ajuster selon rendu

  this.recomputePositions();
}


  // Recalculs si keyPc, gamme, noteStyle ou rotation changent
  update() {
    // Rien à stocker côté labels → juste réévaluer la géométrie si besoin
    this.recomputePositions();
  }

  recomputePositions() {
    const step = TWO_PI / 12;
    this.positions = this.relOrder.map((relChroma, idx) => {
      const angle = this.rotation + idx * step;
      const rx = this.center.x + (this.radius - this.ringThickness / 2) * Math.cos(angle);
      const ry = this.center.y + (this.radius - this.ringThickness / 2) * Math.sin(angle);
      const lx = this.center.x + (this.radius * this.labelRadiusFactor) * Math.cos(angle);
      const ly = this.center.y + (this.radius * this.labelRadiusFactor) * Math.sin(angle);
      return { relChroma, angle, rx, ry, lx, ly };
    });
  }

  // Dessin AU-DESSUS du Tonnetz (appeler après tonnetz.draw())
  draw(rootPc = null) {
    if (this.hide) return;

    push();

    // cercle rempli du fond ombré
    drawingContext.filter = 'blur(30px)'; // rayon du flou
    let bg = color(this.CONFIG.colors.bg);
        bg.setAlpha(255); // opacité de l’ombre
    fill(bg);
    ellipse(this.center.x, this.center.y, this.radius * 2.3);
    drawingContext.filter = 'none';

    noFill();
    stroke(CONFIG.colors.inactiveNodeStroke);
    strokeWeight(1);

    // Prépare styles de texte
    textFont(this.CONFIG.fontFamily);
    textStyle(this.CONFIG.fontWeight);
    textSize(this.radius * 0.15);
    textAlign(CENTER, CENTER);

    // Sets d’état
    const gamme = this.tonnetz.gamme;
    const inScaleSet = new Set(gamme?.pitchClasses ?? []);
    const playedSet = new Set(this.tonnetz.activePcs ?? []);


for (const [i, p] of this.positions.entries()) {
  const pcAbs = mod12(this.tonnetz.keyPc + p.relChroma);
  const inScale = this.tonnetz.gamme.pitchClasses.includes(pcAbs);
  const isActive = playedSet.has(pcAbs);
  const isRoot = rootPc !== null && pcAbs === rootPc;

  if (isActive) {
    this.lastActiveTimes[pcAbs] = millis();
  }
  const fadeFactor = getFadeFactor(this.lastActiveTimes[pcAbs]);

  const angle = Math.atan2(p.ly - this.center.y, p.lx - this.center.x);
  const arcWidth = radians(28);
  
  // arc qui rempli le fond coloré si dans la gamme
  if (inScale) {
      const c = color(this.CONFIG.colors.noteColors[i]);
      c.setAlpha(isActive ? 220 : 80);
      stroke(c);
      //stroke(CONFIG.colors.noteColors[i]);
      strokeWeight(this.radius * 0.3);
      noFill();
      strokeCap(SQUARE);
      arc(this.center.x, this.center.y, this.radius * 1.7, this.radius * 1.7,
        angle - arcWidth / 2, angle + arcWidth / 2);
    }
    
  // arc extérieur
  const fullArcWidth = radians(32); // largeur totale de l’arc 
  strokeWeight(this.radius * ((i == 0) ? 0.02 : 0.01)
                * isActive ? 8 : 1    ); // trait plus épais pour la tonique
  stroke(
    isRoot ? this.CONFIG.colors.rootStroke :
    isActive
        ? this.CONFIG.colors.playedStroke
        : inScale
          ? this.CONFIG.colors.selectedNodeStroke
          : this.CONFIG.colors.inactiveNodeStroke
  );
  noFill();
  arc(this.center.x, this.center.y, this.radius * 2, this.radius * 2,
      angle - fullArcWidth / 2, angle + fullArcWidth / 2);


  // arc intérieur     
  const innerR = this.radius * 0.7;
    strokeWeight(this.radius * ((i == 0) ? 0.02 : 0.01)
                * isActive ? 8 : 1    ); // trait plus épais pour la tonique
    arc(this.center.x, this.center.y, innerR * 2, innerR * 2,
      angle - fullArcWidth / 2, angle + fullArcWidth / 2);

  const rawName = inScale
    ? this.tonnetz.gamme.getNoteName(pcAbs)
    : pcToName(pcAbs, this.tonnetz.noteStyle);
  const rawDegree = this.tonnetz.gamme.getDegreeLabel(p.relChroma, this.tonnetz.noteStyle);

  const name = toUnicodeAlteration(rawName);
  const degree = toUnicodeAlteration(rawDegree);

  const letter = name.charAt(0);
  const accidental = name.slice(1);

  const baseSize = this.radius * 0.22;
  const accidentalSize = baseSize * 0.75;
  const degreeSize = baseSize * 0.6;

  const noteR = (this.radius + innerR) / 2;
  const noteX = this.center.x + Math.cos(angle) * noteR;
  const noteY = this.center.y + Math.sin(angle) * noteR;

  const degreeR = innerR * 0.85;
  const degreeX = this.center.x + Math.cos(angle) * degreeR;
  const degreeY = this.center.y + Math.sin(angle) * degreeR;

  // --- Couche de base : blanc si inScale, gris sinon ---
  let baseColor = inScale
    ? this.CONFIG.colors.nodeLabel
    : this.CONFIG.colors.inactiveNodeLabel;
    

  let labelColor = color(baseColor);
  labelColor.setAlpha(155);
  fill(labelColor);
  noStroke();
  textStyle(this.CONFIG.fontWeight);
  textSize(baseSize);
  text(letter, noteX, noteY);
  if (accidental) {
    textSize(accidentalSize);
    textStyle(NORMAL);
    const offsetR = baseSize * 0.45;
    const offsetA = -40 * Math.PI / 180;
    text(accidental, noteX + Math.cos(offsetA) * offsetR, noteY + Math.sin(offsetA) * offsetR);
  }
  if (degree) {
    textSize(degreeSize);
    textStyle(NORMAL);
    text(degree, degreeX, degreeY);
  }

  // --- Couche highlight : rouge root, jaune active ---
  if (isActive || fadeFactor > 0) {
    let hlColor = this.CONFIG.colors.nodeLabel;
    textStyle(BOLD);
    labelColor = color(hlColor);
    labelColor.setAlpha(255 * fadeFactor);
    fill(labelColor);
    noStroke();

    textSize(baseSize * (isRoot ? 1.1 : 1.0) );
    text(letter, noteX, noteY);
    if (accidental) {
      textSize(accidentalSize);
      const offsetR = baseSize * 0.45;
      const offsetA = -40 * Math.PI / 180;
      text(accidental, noteX + Math.cos(offsetA) * offsetR, noteY + Math.sin(offsetA) * offsetR);
    }
    if (degree) {
      textSize(degreeSize);
      text(degree, degreeX, degreeY);
    }
  }
}



    pop();
  }

  // Interactions
  handleClick(mx, my, mouseButton) {
  if (this.hide) return false;
  if (mouseButton && mouseButton.right) return false; // clic droit ignoré

  const d = dist(mx, my, this.center.x, this.center.y);
  const centerRadius = this.radius * 0.7;

  // --- Priorité 1 : pastille ---
  const hit = this.hitTestNode(mx, my);
  if (hit) {
    const pcAbs = mod12((this.tonnetz.keyPc ?? 0) + hit.relChroma);

    if (keyIsDown(SHIFT)) {
      this.tonnetz.setKey(pcToName(pcAbs, this.tonnetz.noteStyle));
    } else {
      if (this.tonnetz.gamme?.pitchClasses?.includes(pcAbs)) {
        this.tonnetz.gamme.supprimer(pcAbs);
      } else {
        this.tonnetz.gamme.ajouter(pcAbs);
      }
    }

    this.update();
    return true;
  }

  // --- Priorité 2 : anneau interactif (rotation) ---
  if (this.isNearRing(mx, my)) {
    this.isDraggingRing = true;
    this.isDraggingCenter = false;
    this.ringDragStartAngle = Math.atan2(my - this.center.y, mx - this.center.x);
    this.rotationAtRingDragStart = this.rotation;
    cursor(HAND);
    console.log('Drag ring start');
    return true;
  }

  // --- Priorité 3 : centre (déplacement) ---
  if (d < centerRadius) {
    this.isDraggingCenter = true;
    this.isDraggingRing = false;
    this.dragOffset = {
      x: mx - this.center.x,
      y: my - this.center.y
    };
    cursor(MOVE);
    console.log('Drag center start');
    return true;
  }

  cursor(ARROW);
  return false;
}


handleDrag(mx, my) {
  if (this.isDraggingCenter) {
    this.center.x = mx - this.dragOffset.x;
    this.center.y = my - this.dragOffset.y;
    this.recomputePositions();
    return true;
  }

  if (this.isDraggingRing) {
    const currentAngle = Math.atan2(my - this.center.y, mx - this.center.x);
    const delta = currentAngle - this.ringDragStartAngle;
    this.rotation = this.rotationAtRingDragStart + delta;
    this.recomputePositions();
    return true;
  }

  return false;
}


  handleRelease() {
    this.isDraggingRing = false;
    this.isDraggingCenter = false;
  }

  // Helpers

  isNearRing(mx, my) {
    const d = dist(mx, my, this.center.x, this.center.y);
    // Gros anneau cliquable autour de l’anneau pour drag (40 px de bande)
        if (d < this.ringThickness ) {
        cursor(HAND); // curseur en forme de main
        } else {
        cursor(ARROW); // curseur normal
        }
    console.log('Drag center start');
    return d > (this.radius - 40) && d < (this.radius + 40);
  }

  hitTestNode(mx, my) {
    let best = null;
    let bestDist = Infinity;
    const hitR = this.ringThickness * 0.6;

    for (const p of this.positions) {
      const d = dist(mx, my, p.rx, p.ry);
      if (d < hitR && d < bestDist) {
        best = p;
        bestDist = d;
      }
    }
    return best;
  }

  // Utilitaire: accepte valeur hex/rgba de CONFIG et la passe à p5 fill/stroke
  hexOrRgba(v) { return v; }

  // debug: dessine les zones sensibles
  drawHitzone() {
  if (this.hide) return;

  push();
  noFill();

  // --- Zone centrale (drag du COF) ---
  stroke(255, 0, 0, 200); // rouge transparent
  strokeWeight(1);
  const centerRadius = this.radius * 0.7;
  ellipse(this.center.x, this.center.y, centerRadius * 2);

  // --- Zone de rotation (anneau interactif) ---
  stroke(0, 255, 0, 200); // vert transparent
  strokeWeight(1);
  ellipse(this.center.x, this.center.y, (this.radius - 40) * 2); // bord intérieur
  ellipse(this.center.x, this.center.y, (this.radius + 40) * 2); // bord extérieur

  // --- Zones sensibles des pastilles ---
  stroke(0, 0, 255, 200); // bleu transparent
  strokeWeight(1);
  const hitR = this.ringThickness * 0.6;

  for (const p of this.positions) {
    ellipse(p.rx, p.ry, hitR * 2);
  }

  pop();
}

}
