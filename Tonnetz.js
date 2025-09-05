class Tonnetz {
  constructor({ startNote = 'G', H = 8, Vn = 6, canvas, debug = true }) {
    this.startPc = nameToPc(startNote);
    this.H = H;
    this.Vn = Vn;
    this.canvas = canvas;
    this.debug = debug;
    this.hide = false;

    this.keyNote = 'E';
    this.keyPc = nameToPc(this.keyNote);

    this.gamme = new Gamme(this.keyNote);

    this.origin = { x: canvas.width / 2, y: canvas.height / 2 };

    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;

    this.activePcs = new Set();
    this.activeMidiNums = [];
    this.chordDetector = new ChordDetector();
    this.noteStyle = 'mixed';
    NOTE_NAMES = ENHARMONIC_MAPS[this.noteStyle];


    this.netGrid = new NetGrid({
      H: this.H,
      Vn: this.Vn,
      origin: this.origin,
      startPc: this.startPc,
      gamme: this.gamme
    });

    // Références directes pour compatibilité avec le reste du code
    this.updateNodePositions();
  }

  key(i, j) { return `${i},${j}`; }
  get(i, j) { return this.netGrid.nodes.get(this.key(i, j)); }

  setKey(noteName) { // affecte gamme 
    if (noteName === this.keyNote){
      this.netGrid.chordTriangle.build(); 
      return; 
    }
    else {
      // Met à jour la tonique et synchronise avec la gamme
      this.keyNote = noteName;
      this.keyPc = nameToPc(noteName);
      this.gamme.setTonic(noteName);
      this.netGrid.chordTriangle.build();
      console.log(`🎯 Tonique changée : ${this.keyNote} (pc=${this.keyPc})`);
    }
  }


  updateNodePositions() { //affecte NetGrid
    // Met à jour les positions px, py de chaque nœud en fonction du zoom et du pan
    for (const [, n] of this.netGrid.nodes) {
      n.px = this.origin.x + this.panX + (n.xu * CONFIG.unitX) * this.zoom;
      n.py = this.origin.y + this.panY - (n.yu * CONFIG.unitY) * this.zoom;
    }
  }


  pan(dx, dy) {
    this.panX += dx;
    this.panY += dy;
    this.updateNodePositions();
  }

  zoomAt(mx, my, factor) {
    let newZoom = this.zoom * factor;
    newZoom = Math.max(CONFIG.zoomMin, Math.min(CONFIG.zoomMax, newZoom));

    const worldX = (mx - this.origin.x - this.panX) / this.zoom;
    const worldY = (my - this.origin.y - this.panY) / this.zoom;

    this.zoom = newZoom;

    this.panX = mx - this.origin.x - worldX * this.zoom;
    this.panY = my - this.origin.y - worldY * this.zoom;

    this.updateNodePositions();
  }


  resize(width, height) {
    this.origin.x = width / 2;
    this.origin.y = height / 2;
    this.updateNodePositions();
  }

  drawGrid(g) {
    g.strokeWeight(1);
    const cols = Math.ceil(this.canvas.width / CONFIG.unitX / this.zoom) + 2;
    for (let xu = -cols; xu <= cols; xu++) {
      const pc = mod12(this.startPc + xu); // ← pitch class de cette colonne

      // 💡 Afficher uniquement si le pc est dans la gamme
      if (!this.gamme.pitchClasses.includes(pc)) continue;

      const x = this.origin.x + this.panX + xu * CONFIG.unitX * this.zoom;
      const is12 = mod12(xu) === 0;
      g.stroke(is12 ? CONFIG.colors.grid12 : CONFIG.colors.grid);
      g.line(x, 0, x, this.canvas.height);
    }
  }


  drawEdges(g) {
    for (const e of this.netGrid.edges) {
      const active = this.activePcs.has(e.a.pc) && this.activePcs.has(e.b.pc);
      let col = active
        ? g.color(
          e.interval === 'P5' ? CONFIG.colors.edgeP5 :
            e.interval === 'M3' ? CONFIG.colors.edgeM3 :
              CONFIG.colors.edgem3
        )
        : g.color(CONFIG.colors.grid);
      g.stroke(col);
      g.strokeWeight(active ? CONFIG.edgeWidthThick : CONFIG.edgeWidthThin);
      g.line(e.a.px, e.a.py, e.b.px, e.b.py);
    }
  }

  drawNodes(g) {
    for (const [, node] of this.netGrid.nodes) {
      const isActive = node.isActive(this.activePcs);
      const isTonic = node.pc === this.keyPc;
      const isRoot = this.isRoot(node);
      const inGamme = this.gamme?.pitchClasses.includes(node.pc) || false;

      const zoom = this.zoom;

      // On transmet le contexte et tous les états
      node.draw(g, isActive, isTonic, isRoot, inGamme, zoom, this.gamme);

    }
  }

  // draw principal 
  draw(g) {
    if (this.hide) return;
    g.push();
    g.background(CONFIG.colors.bg);
    this.drawGrid(g);
    this.drawEdges(g);    
    if (this.netGrid.chordTriangle) {
      this.netGrid.chordTriangle.draw(g, this.zoom, this.activePcs);
    }


    this.drawNodes(g);
    g.pop();
  }


  findNodeAt(mx, my) {
    // interaction souris
    // renvoie le nœud le plus proche de la position (mx, my)
    let nearestNode = null;
    let minDist = CONFIG.nodeRadius * this.zoom + 2;
    for (const [, n] of this.netGrid.nodes) {
      const dx = mx - n.px;
      const dy = my - n.py;
      const dist = Math.hypot(dx, dy);
      if (dist <= minDist) {
        minDist = dist;
        nearestNode = n;
      }
    }
    return nearestNode;
  }

  setNoteStyle(style) {
    // Met à jour le style d'affichage des notes (noms enharmoniques)
    // style : 'sharp', 'flat', 'mixed'
    // styles par défaut hors contexte 
    // mais si une gamme est définie, on prend directement les noms de notes de la gamme
    if (ENHARMONIC_MAPS[style]) {
      this.noteStyle = style;
      NOTE_NAMES = ENHARMONIC_MAPS[style];
      for (const [, n] of this.netGrid.nodes) {
        n.name = pcToName(n.pc);
      }
    }
  }

  togglePc(pc) {
    // Ne jamais retirer la tonique
    if (pc === this.keyPc) return;

    if (this.gamme.pitchClasses.includes(pc)) {
      this.gamme.supprimer(pc);
    } else {
      this.gamme.ajouter(pc);
    }

    // Recalcule les triangles
    if (this.netGrid.chordTriangle) {
      this.netGrid.chordTriangle.setGamme(this.gamme);
      this.netGrid.chordTriangle.build();
    }
  }


  toggleActivePc(pc) {
    this.activePcs.has(pc) ? this.activePcs.delete(pc) : this.activePcs.add(pc);
    // mise a jour des triangles
     // Met à jour la tonique du Tonnetz pour rester synchronisé
    this.setKey(this.gamme.tonicNote);    
  }

  transposeGamme(offset) {
    // transposition absolue de la gamme
    if (!this.gamme) return;

    // Transpose la gamme
    this.gamme.transpose(offset);

    // Met à jour la tonique du Tonnetz pour rester synchronisé
    this.setKey(this.gamme.tonicNote);
  }

  // Dans la classe Tonnetz
  rotateMode() {
    // interaction touche T
    // fait tourner les modes de la gamme
    // saut par quinte pour aller dans l'ordre de "clarte"
    // 
    const g = this.gamme;
    if (!g || !g.signature) return;

    const sig = g.signature;
    const n = sig.length;

    // Liste des décalages à tester : quinte juste (7), quinte diminuée (6)
    const offsets = [7, 6];

    for (let offset of offsets) {
      // Décalage circulaire vers la gauche
      const rotated = sig.slice(offset) + sig.slice(0, offset);

      // On ne touche pas à la tonique → signature doit commencer par '1'
      if (rotated[0] === '1') {
        g.setSignature(rotated);
        return;
      }
    }
    // Si aucune rotation valide trouvée, ne fait rien
  }

  relativeTranspose() {
    // interaction touche R 
    // affecte une nouvelle tonique dans la gamme = transposition relative
    // C maj ionien / A min eolien / G mixolydian / F lydian ...

    if (!this.gamme || !this.gamme.pitchClasses || this.gamme.pitchClasses.length < 2) return;

    const currentPc = this.gamme.tonicPc;
    const pcs = this.gamme.pitchClasses;
    const index = pcs.indexOf(currentPc);
    const nextPc = pcs[(index + 1) % pcs.length];

    this.gamme.setTonic(pcToName(nextPc));
    this.setKey(pcToName(nextPc)); // synchronise la tonique visuelle
  }


  getActiveNotes() {
    // Renvoie les noms des notes actives, sans doublons
    // utilisé par sketch.js
    const activeNotes = [];
    for (const [, node] of this.netGrid.nodes) {
      if (this.activePcs.has(node.pc)) activeNotes.push(node.name);
    }
    return [...new Set(activeNotes)];
  }

  updateFromMidi(midiNums) {
    const signature = (midiNums || []).slice().sort((a, b) => a - b).join(',');
    if (signature === this.lastMidiSignature) return;

    this.lastMidiSignature = signature;
    this.activeMidiNums = midiNums || [];

    // 1. Met à jour les pitch classes actives
    this.activePcs = new Set(this.activeMidiNums.map(n => mod12(n)));

    // 2. Reconstruit les noms de notes à partir des nœuds si possible
    // const activeNames = this.activeMidiNums.map(n => {
    //   const pc = mod12(n);
    //   const node = [...this.netGrid.nodes.values()].find(nd => nd.pc === pc);
    //   return node?.name ?? pcToName(pc, this.noteStyle); // ← priorité au nom du nœud
    // });
    const activeNames = this.activeMidiNums.map(n => {
      const pc = mod12(n);
      // On récupère le node correspondant si besoin
      const node = [...this.netGrid.nodes.values()].find(nd => nd.pc === pc);

      // On demande à la gamme le nom de la note pour ce PC
      const nameFromGamme = this.gamme?.getNoteName?.(pc);

      // Priorité au nom calculé par la gamme, sinon fallback sur node.name, sinon pcToName
      return nameFromGamme ?? node?.name ?? pcToName(pc, this.noteStyle);
    });

    // 3. Détection des accords
    if (activeNames.length >= 3)
      this.lastDetectedChords = this.chordDetector.detect(activeNames, midiNums || []);
  }


  getDetectedChords() {
    // Renvoie le dernier résultat de détection d'accords
    return this.lastDetectedChords || [];
  }

  isRoot(node) {
    // Vérifie si la note est la fondamentale d'un des accords détectés
    const chords = this.getDetectedChords();
    return chords.length && chords[0].root === node.name;
  }

  // interaction souris
handleClick(mx, my, button) {
  if (this.hide) return false;

  // 1. Triangle momentary
  if (this.netGrid?.chordTriangle?.handlePress(mx, my)) {
    return true; // clic consommé
  }

  // 2. Nœud du Tonnetz
  const node = this.findNodeAt(mx, my);
  if (node) {
    const pc = node.pc;
    if (keyIsDown(SHIFT)) {
      this.setKey(node.name);
      if (!this.gamme.chroma.includes(this.keyPc)) {
        this.gamme.ajouter(this.keyPc);
      }
    } else {
      this.togglePc(pc);
    }
    return true;
  }

  // 3. (plus tard) clic sur autre élément interactif du Tonnetz
  // ex: boutons, zones spéciales, etc.

  return false; // rien capté
}


  handleHover(mx, my) {
    if (this.hide) return;
    this.netGrid.chordTriangle.handleHover(mx, my);
  }

  handleRelease() {
    if (this.hide) return;
    this.netGrid.chordTriangle.handleRelease();
  }

  // interaction clavier
  handlePress(mx, my) {
    if (this.hide) return false;
    return this.netGrid.chordTriangle.handlePress(mx, my);
  }

}
