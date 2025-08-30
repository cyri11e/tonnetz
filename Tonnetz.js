class Tonnetz {
  constructor({ startNote = 'G', H = 8, Vn = 6, canvas, debug = true }) {
    this.startPc = nameToPc(startNote);
    this.H = H;
    this.Vn = Vn;
    this.canvas = canvas;
    this.debug = debug;

    this.keyNote = 'D#';
    this.keyPc = nameToPc(this.keyNote);

    this.gamme = new Gamme(this.keyNote);

    this.origin = { x: canvas.width / 2, y: canvas.height / 2 };

    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;

    this.selectedPcs = new Set();
    this.activeMidiNums = [];
    this.chordDetector = new ChordDetector();
    this.noteStyle = 'mixed';
    NOTE_NAMES = ENHARMONIC_MAPS[this.noteStyle];

    this.nodes = new Map();
    this.edges = [];
    // this.triangles = [];
    this.specialSegments = [];
    this.netGrid = new NetGrid({
      H: this.H,
      Vn: this.Vn,
      origin: this.origin,
      startPc: this.startPc,
      gamme: this.gamme
    });

    // Références directes pour compatibilité avec le reste du code
    this.nodes = this.netGrid.nodes;
    this.edges = this.netGrid.edges;
    this.updateNodePositions();
  }

  key(i, j) { return `${i},${j}`; }
  get(i, j) { return this.nodes.get(this.key(i, j)); }

  setKey(noteName) {
    this.keyNote = noteName;
    this.keyPc = nameToPc(noteName);
    this.gamme.setTonic(noteName);
    console.log(`🎯 Tonique changée : ${this.keyNote} (pc=${this.keyPc})`);
  }


  updateNodePositions() {
    for (const [, n] of this.nodes) {
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
    for (const e of this.edges) {
      const active = this.selectedPcs.has(e.a.pc) && this.selectedPcs.has(e.b.pc);
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
    for (const [, node] of this.nodes) {
      const isActive = node.isActive(this.selectedPcs);
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
    g.push();
    g.background(CONFIG.colors.bg);
    this.drawGrid(g);
    //this.drawTriangles(g);
    if (this.netGrid.chordTriangle) {
      this.netGrid.chordTriangle.draw(g, this.zoom, this.gamme);
    }

    this.drawEdges(g);
    this.drawNodes(g);
    g.pop();
  }


  findNodeAt(mx, my) {
    let nearestNode = null;
    let minDist = CONFIG.nodeRadius * this.zoom + 2;
    for (const [, n] of this.nodes) {
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
    if (ENHARMONIC_MAPS[style]) {
      this.noteStyle = style;
      NOTE_NAMES = ENHARMONIC_MAPS[style];
      for (const [, n] of this.nodes) {
        n.name = pcToName(n.pc);
      }
    }
  }

  togglePc(pc) {
    this.selectedPcs.has(pc) ? this.selectedPcs.delete(pc) : this.selectedPcs.add(pc);
  }

  transposeGamme(offset) {
    if (!this.gamme) return;

    // Transpose la gamme
    this.gamme.transpose(offset);

    // Met à jour la tonique du Tonnetz pour rester synchronisé
    this.setKey(this.gamme.tonicNote);
  }

  // Dans la classe Tonnetz
  rotateMode() {
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
    if (!this.gamme || !this.gamme.pitchClasses || this.gamme.pitchClasses.length < 2) return;

    const currentPc = this.gamme.tonicPc;
    const pcs = this.gamme.pitchClasses;
    const index = pcs.indexOf(currentPc);
    const nextPc = pcs[(index + 1) % pcs.length];

    this.gamme.setTonic(pcToName(nextPc));
    this.setKey(pcToName(nextPc)); // synchronise la tonique visuelle
  }


  getActiveNotes() {
    const activeNotes = [];
    for (const [, node] of this.nodes) {
      if (this.selectedPcs.has(node.pc)) activeNotes.push(node.name);
    }
    return [...new Set(activeNotes)];
  }

  setMidiNotes(notes, midiNums) {
    const signature = (midiNums || []).slice().sort((a, b) => a - b).join(',');
    if (signature === this.lastMidiSignature) return;
    this.lastMidiSignature = signature;
    this.selectedPcs.clear();
    (notes || []).forEach(note => this.selectedPcs.add(nameToPc(note)));
    this.activeMidiNums = midiNums || [];
    this.lastDetectedChords = this.chordDetector.detect(notes || [], midiNums || []);
  }

  getDetectedChords() {
    return this.lastDetectedChords || [];
  }

  isRoot(node) {
    const chords = this.getDetectedChords();
    return chords.length && chords[0].root === node.name;
  }
}
