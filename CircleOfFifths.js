class CircleOfFifths {
  constructor(tonnetz) {
    this.tonnetz = tonnetz;
    this.hide = true;
    this.fifths = 0;
    this.mode = 
    this.order = [[0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5],[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 ]]
    this.relOrder = this.order[ this.fifths];
    this.center = { x: 0, y: 0 };
    this.radius = 0;
    this.ringThickness = Math.max(18, Math.floor(CONFIG.nodeRadius * 3));
    this.labelRadiusFactor = 0.82;
    this.rotation = -HALF_PI;

    this.isDraggingRing = false;
    this.dragStartAngle = 0;
    this.rotationAtDragStart = 0;

    this.isDraggingNotes = false;
    this.noteDragStartAngle = 0;
    this.rotationAtNoteDragStart = 0;


    this.positions = [];
    this.lastActiveTimes = Array(12).fill(0);
  }

  build() {
    const d = Math.floor(0.5 * Math.min(width, height));
    this.radius = d / 2;
    this.center.x = width / 2;
    this.center.y = height / 2;
    this.ringThickness = this.radius * 0.40;
    this.recomputePositions();
  }

  update() {
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

drawShadow() {
  push(); 
  drawingContext.filter = 'blur(30px)';
  let bg = color(CONFIG.colors.bg);
  bg.setAlpha(255);
  fill(bg);
  ellipse(this.center.x, this.center.y, this.radius * 2.3);
  drawingContext.filter = 'none';
  pop();
}

// Dessine le nom de note (lettre + altération) et le degré, avec effet de fade/activité
drawNote(p, pcAbs, inScale, isActive, isRoot, fadeFactor) {
  // 1) Récupération et normalisation des labels
  const gamme = this.tonnetz.gamme;
  const rawName = inScale && gamme ? gamme.getNoteName(pcAbs) : pcToName(pcAbs, this.tonnetz.noteStyle);
  const rawDegree = gamme ? gamme.getDegreeLabel(p.relChroma, this.tonnetz.noteStyle) : '';
  const name = toUnicodeAlteration(rawName);
  const degree = toUnicodeAlteration(rawDegree);

  // Sépare la lettre de l’altération (ex: "C#": letter="C", accidental="#")
  const letter = name.charAt(0);
  const accidental = name.slice(1);

  // 2) Tailles typographiques
  const baseSize = this.radius * 0.22;
  const accidentalSize = baseSize * 0.75;
  const degreeSize = baseSize * 0.6;

  // 3) Positions polaires → cartésiennes
  const angle = p.angle;
  const innerR = this.radius * 0.7;
  const noteR = (this.radius + innerR) / 2;         // position du nom de note entre les deux arcs
  const degreeR = innerR * 0.85;                    // position du degré un peu à l’intérieur

  const noteX = this.center.x + Math.cos(angle) * noteR;
  const noteY = this.center.y + Math.sin(angle) * noteR;

  const degreeX = this.center.x + Math.cos(angle) * degreeR;
  const degreeY = this.center.y + Math.sin(angle) * degreeR;

  // 4) Couleur de base (atténuée si hors gamme)
  let labelColor = color(inScale ? CONFIG.colors.nodeLabel : CONFIG.colors.inactiveNodeLabel);
  labelColor.setAlpha(inScale ? 155 : 60);
  fill(labelColor);
  noStroke();

  // 5) Dessin du nom de note (lettre + altération légèrement décalée)
  this.drawText(letter, noteX, noteY, baseSize);
  if (accidental) {
    const offsetR = baseSize * 0.45;               // distance du décalage de l’altération
    const offsetA = -40 * Math.PI / 180;           // angle de décalage (léger haut-gauche)
    this.drawText(
      accidental,
      noteX + Math.cos(offsetA) * offsetR,
      noteY + Math.sin(offsetA) * offsetR,
      accidentalSize,
      NORMAL
    );
  }

  // 6) Dessin du degré (si disponible)
  if (degree) {
    this.drawText(degree, degreeX, degreeY, degreeSize, NORMAL);
  }

  // 7) Surcouche de surbrillance quand joué/récemment joué (fadeFactor)
  if (isActive || fadeFactor > 0) {
    const hl = color(CONFIG.colors.nodeLabel);
    hl.setAlpha(255 * fadeFactor);
    fill(hl);
    noStroke();

    // Lettre en gras et légèrement plus grande si c’est la tonique
    this.drawText(letter, noteX, noteY, baseSize * (isRoot ? 1.1 : 1.0), BOLD);

    if (accidental) {
      const offsetR = baseSize * 0.45;
      const offsetA = -40 * Math.PI / 180;
      this.drawText(
        accidental,
        noteX + Math.cos(offsetA) * offsetR,
        noteY + Math.sin(offsetA) * offsetR,
        accidentalSize,
        NORMAL
      );
    }

    if (degree) {
      this.drawText(degree, degreeX, degreeY, degreeSize, NORMAL);
    }
  }
}

getArcColor(i, isActive, isRoot, inScale) {
  if (isRoot) return CONFIG.colors.rootStroke;
  if (isActive) return CONFIG.colors.playedStroke;
  if (inScale) return CONFIG.colors.selectedNodeStroke;
  return CONFIG.colors.inactiveNodeStroke;
}
  

drawArcLayer({ radius, angle, angleWidth = radians(30), thickness, colorVal, alpha = 255 }) {
  const c = color(colorVal);
  c.setAlpha(alpha);
  stroke(c);
  strokeWeight(thickness);
  noFill();
  strokeCap(SQUARE);
  arc(
    this.center.x,
    this.center.y,
    radius * 2,
    radius * 2,
    angle - angleWidth / 2,
    angle + angleWidth / 2
  );
}


drawText(txt, x, y, size, style = CONFIG.fontWeight) {
  textFont(CONFIG.fontFamily);
  textAlign(CENTER, CENTER);
  textStyle(style);
  textSize(size);
  text(txt, x, y);
}


draw(rootPc = null) {
  if (this.hide) return;

  push(); // Sauvegarde le contexte graphique

  // 🌫️ Ombre floutée derrière le cercle
  this.drawShadow();

  const gamme = this.tonnetz.gamme;
  const inScaleSet = new Set(gamme?.pitchClasses ?? []);
  const playedSet = new Set(this.tonnetz.activePcs ?? []);

  for (const [i, p] of this.positions.entries()) {
    const pcAbs = mod12(this.tonnetz.keyPc + p.relChroma);
    const inScale = inScaleSet.has(pcAbs);
    const isActive = playedSet.has(pcAbs);
    const isRoot = rootPc !== null && pcAbs === rootPc;

    // ⏱️ Mémorise le moment où la note a été jouée
    if (isActive) this.lastActiveTimes[pcAbs] = millis();
    const fadeFactor = getFadeFactor(this.lastActiveTimes[pcAbs]);

    
    // 🔸 Alpha dynamique basé sur l'activité (fond)
    const bgAlpha = fadeFactor > 0 ? 220 * fadeFactor : CONFIG.inactiveNoteBgalpha;
    
    // 🟡 Arc de fond (seulement pour les notes dans la gamme)
    if (inScale) {
      this.drawArcLayer({
        radius: this.radius * 0.85,
        angle: p.angle,
        angleWidth: radians(28),
        thickness: this.radius * 0.3,
        colorVal: CONFIG.colors.noteColors[i],
        alpha: bgAlpha
      });
    }
    
    // effet neon 
    if ( inScale || isActive ) {
      push();
      drawingContext.filter = 'blur(20px)';

      const glowColor = color(this.getArcColor(i, isActive, isRoot, inScale));
      glowColor.setAlpha(isActive ? 255 : CONFIG.inactiveNoteBgalpha); // intensité du néon
      stroke(glowColor);
      strokeWeight(this.radius * 0.05); // épaisseur du liseré lumineux
      noFill();

      arc(
        this.center.x + this.radius * 0.01,
        this.center.y + this.radius * 0.01,
        this.radius * 2.03,
        this.radius * 2.03,
        p.angle - radians(30) / 2,
        p.angle + radians(30) / 2
      );
      arc(
        this.center.x + this.radius * 0.01,
        this.center.y + this.radius * 0.01,
        this.radius * 1.37,
        this.radius * 1.37,
        p.angle - radians(30) / 2,
        p.angle + radians(30) / 2
      );
      drawingContext.filter = 'none';
      pop();
    }



    // 🔸 Alpha dynamique basé sur l'activité
    const arcAlpha = (isActive || fadeFactor > 0) ? 255 * fadeFactor : 0;

    // 🔵 Arc extérieur
    this.drawArcLayer({
      radius: this.radius,
      angle: p.angle,
      thickness: this.radius * ((i === 0) ? 0.03 : 0.02) * (1 + 1.2 * fadeFactor),

      colorVal: this.getArcColor(i, isActive, isRoot, inScale),
      alpha: inScale ? 255 :  arcAlpha
    });

    // 🔵 Arc intérieur
    this.drawArcLayer({
      radius: this.radius * 0.7,
      angle: p.angle,
      thickness: this.radius * ((i === 0) ? 0.03 : 0.02) * (1 + 1.2 * fadeFactor),
      colorVal: this.getArcColor(i, isActive, isRoot, inScale),
      alpha: inScale ? 255 :  arcAlpha
    });

    // 🎵 Nom de la note et degré
    this.drawNote(p, pcAbs, inScale, isActive, isRoot, fadeFactor);
  }

  pop(); // Restaure le contexte graphique
}




  // Interactions
handleClick(mx, my, mouseButton) {
  if (this.hide) return false;
  if (mouseButton && mouseButton.right) return false;   
    
  if (keyIsDown(SHIFT))
    {
    this.fifths = (this.fifths + 1) % 2;
    this.relOrder = this.order[this.fifths];
    this.recomputePositions();
    return false; 
  }


  const d = dist(mx, my, this.center.x, this.center.y);
  const centerRadius = this.radius * 0.7;

  // --- Priorité 1 : pastille (note du cercle) ---
  const hit = this.hitTestNode(mx, my);
  if (hit) {
    this.clickedNote = hit;

    // On mémorise l'angle de départ, mais on n'active pas le drag ici
    this.noteDragStartAngle = Math.atan2(my - this.center.y, mx - this.center.x);
    this.rotationAtNoteDragStart = this.rotation;

    // Reset des flags de drag pour cette interaction
    this.isDraggingNotes = false;
    this.isDraggingRing = false;
    this.isDraggingCenter = false;

    cursor(HAND);
    console.log(`Note cliquée: relChroma=${hit.relChroma}`);
    return true;
  }

  // --- Priorité 2 : anneau interactif (rotation libre) ---

if (hit && this.isInsideNoteRing(mx, my)) {
  this.clickedNote = hit;
  this.noteDragStartAngle = Math.atan2(my - this.center.y, mx - this.center.x);
  this.rotationAtNoteDragStart = this.rotation;
  this.isDraggingNotes = false; // ← sera activé si drag réel
  cursor(HAND);
  console.log(`Note cliquée dans l'anneau: relChroma=${hit.relChroma}`);
  return true;
}

if (this.isNearRing(mx, my)) {
  this.isDraggingRing = true;
  this.ringDragStartAngle = Math.atan2(my - this.center.y, mx - this.center.x);
  this.rotationAtRingDragStart = this.rotation;
  cursor(HAND);
  console.log("Drag anneau démarré");
  return true;
}


  // --- Priorité 3 : centre (déplacement du COF) ---
  if (d < centerRadius) {
    this.isDraggingCenter = true;
    this.dragOffset = {
      x: mx - this.center.x,
      y: my - this.center.y
    };
    cursor(MOVE);
    return true;
  }

  cursor(ARROW);
  return false;
}





handleDrag(mx, my) {
  const dx = mx - this.center.x;
  const dy = my - this.center.y;
  const dist = Math.hypot(dx, dy);

  // Seuil de mouvement pour considérer un vrai drag
  const moveThreshPx = 3; // pixels
  const angleNow = Math.atan2(my - this.center.y, mx - this.center.x);
  const angleDeltaNotes = this.clickedNote
    ? angleNow - this.noteDragStartAngle
    : 0;
  const angleThresh = 0.02; // radians ~1.1°

  // Drag centre
  if (this.isDraggingCenter) {
    if (dist < moveThreshPx) return false;
    this.center.x = mx - this.dragOffset.x;
    this.center.y = my - this.dragOffset.y;
    this.recomputePositions();
    return true;
  }

  // Drag anneau libre
  if (this.isDraggingRing) {
    if (dist < moveThreshPx) return false;
    const delta = angleNow - this.ringDragStartAngle;
    this.rotation = this.rotationAtRingDragStart + delta;
    this.recomputePositions();
    return true;
  }

  // Drag notes (rotation graphique)
  if (this.clickedNote) {
    // On ne bascule en "drag notes" que si on dépasse le seuil angulaire
    if (!this.isDraggingNotes && Math.abs(angleDeltaNotes) < angleThresh) {
      return false; // pas encore un drag
    }
    // Maintenant c'est un vrai drag
    this.isDraggingNotes = true;
    this.rotation = this.rotationAtNoteDragStart + angleDeltaNotes;
    this.recomputePositions();
    return true;
  }

  return false;
}


handleRelease() {
  // Décide clic vs drag pour les notes
  if (this.clickedNote) {
    const angleNow = Math.atan2(mouseY - this.center.y, mouseX - this.center.x);
    const angleDelta = angleNow - this.noteDragStartAngle;
    const angleThresh = 0.02; // même seuil que dans handleDrag

    const isClick = !this.isDraggingNotes && Math.abs(angleDelta) < angleThresh;

    if (isClick) {
      const pcAbs = mod12((this.tonnetz.keyPc ?? 0) + this.clickedNote.relChroma);
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
    }
  }

  // Reset flags
  this.clickedNote = null;
  this.isDraggingNotes = false;
  this.isDraggingRing = false;
  this.isDraggingCenter = false;
  cursor(ARROW);
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
    return d > (this.radius - 40) && d < (this.radius + 40);
  }
isInsideNoteRing(mx, my) {
  const d = dist(mx, my, this.center.x, this.center.y);
  return d < this.radius * 0.85; // ← même rayon que les pastilles
}

  isMouseOver(mx, my) {
    const d = dist(mx, my, this.center.x, this.center.y);
    return d < this.radius * 1.2; // ← marge de tolérance
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
