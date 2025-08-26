class Tonnetz {
  constructor({ startNote = 'C', H = 8, Vn = 6, canvas, debug = true }) {
    // Paramètres de base
    this.startPc = nameToPc(startNote); // depuis helpers.js
    this.H = H;
    this.Vn = Vn;
    this.canvas = canvas;
    this.debug = debug;

    // Origine graphique
    this.origin = { x: canvas.width / 2, y: canvas.height / 2 };

    // Données de la grille
    this.nodes = new Map();
    this.edges = [];
    this.triangles = [];

    // État musical
    this.selectedPcs = new Set();
    this.activeMidiNums = [];
    this.chordDetector = new ChordDetector();
    this.noteStyle = 'mixed';
    NOTE_NAMES = ENHARMONIC_MAPS[this.noteStyle]; // helpers.js
    this.keyNote = 'C';
    this.keyPc = nameToPc(this.keyNote);

    // État de vue
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;

    // Construction
    this.buildNodes();
    this.buildEdges();
    this.buildTriangles();
    this.computeXRange();
  }

  key(i, j) { return `${i},${j}`; }
  get(i, j) { return this.nodes.get(this.key(i, j)); }

  setKey(noteName) {
    this.keyNote = noteName;
    this.keyPc = nameToPc(noteName); // helpers.js
    console.log(`🎯 Tonique changée : ${this.keyNote} (pc=${this.keyPc})`);

  }

  // --- Construction de la grille ---
  buildNodes() {
    for (let s = -this.Vn; s <= this.Vn; s++) {
      for (let i = -this.H; i <= this.H; i++) {
        const j = s - i;
        const node = new NoteNode(i, j, this.origin, this.startPc);
        this.nodes.set(this.key(i, j), node);
      }
    }
  }

  buildEdges() {
    for (const [, node] of this.nodes) {
      const { i, j } = node;
      const nU = this.get(i + 1, j);
      const nV = this.get(i, j + 1);
      const nQ = this.get(i + 1, j - 1);

      if (nU) this.edges.push(new IntervalEdge(node, nU, 'M3'));
      if (nV) this.edges.push(new IntervalEdge(node, nV, 'm3'));
      if (nQ) this.edges.push(new IntervalEdge(node, nQ, 'P5'));
    }
  }

  buildTriangles() {
    this.triangles = [];
    const seen = new Set();
    const idOf = (n) => this.key(n.i, n.j);
    const pushTri = (a, b, c) => {
      const key = [idOf(a), idOf(b), idOf(c)].sort().join('|');
      if (!seen.has(key)) {
        seen.add(key);
        this.triangles.push([a, b, c]);
      }
    };
    const areNeighbors = (n1, n2) =>
      this.edges.some(e =>
        ((e.a === n1 && e.b === n2) || (e.a === n2 && e.b === n1))
      );

    for (const [, node] of this.nodes) {
      const { i, j } = node;
      const nU = this.get(i + 1, j);
      const nV = this.get(i, j + 1);
      const nQ = this.get(i + 1, j - 1);
      const pU = this.get(i - 1, j);
      const pV = this.get(i, j - 1);
      const pQ = this.get(i - 1, j + 1);

      if (nU && nQ && areNeighbors(node, nU) && areNeighbors(node, nQ) && areNeighbors(nU, nQ)) pushTri(node, nU, nQ);
      if (nV && nQ && areNeighbors(node, nV) && areNeighbors(node, nQ) && areNeighbors(nV, nQ)) pushTri(node, nV, nQ);
      if (pU && pQ && areNeighbors(node, pU) && areNeighbors(node, pQ) && areNeighbors(pU, pQ)) pushTri(node, pU, pQ);
      if (pV && pQ && areNeighbors(node, pV) && areNeighbors(node, pQ) && areNeighbors(pV, pQ)) pushTri(node, pV, pQ);
    }
  }

  computeXRange() {
    const totalWidth = this.canvas.width;
    this.H = Math.ceil((totalWidth / 2) / CONFIG.unitX);
    this.minXu = Math.floor(-totalWidth / CONFIG.unitX);
    this.maxXu = Math.ceil(totalWidth / CONFIG.unitX);
  }

  // --- Gestion de l’état musical ---
  togglePc(pc) {
    this.selectedPcs.has(pc) ? this.selectedPcs.delete(pc) : this.selectedPcs.add(pc);
  }

  setNoteStyle(style) {
    if (ENHARMONIC_MAPS[style]) {
      this.noteStyle = style;
      NOTE_NAMES = ENHARMONIC_MAPS[style];
    }
  }

  getActiveNotes() {
    const activeNotes = [];
    for (const [, node] of this.nodes) {
      if (node.isActive(this.selectedPcs)) activeNotes.push(node.name);
    }
    return [...new Set(activeNotes)];
  }

  setMidiNotes(notes, midiNums) {
    const signature = midiNums.slice().sort((a,b) => a - b).join(',');
    if (signature === this.lastMidiSignature) return;
    this.lastMidiSignature = signature;
    this.selectedPcs.clear();
    notes.forEach(note => this.selectedPcs.add(nameToPc(note)));
    this.activeMidiNums = midiNums || [];
    this.lastDetectedChords = this.chordDetector.detect(notes, midiNums);
  }

  getDetectedChords() {
    return this.lastDetectedChords || [];
  }

  isRoot(node) {
    const chords = this.getDetectedChords();
    return chords.length && chords[0].root === node.name;
  }

  // --- Rendu ---
  drawGrid(g) {
    g.push();
    g.translate(this.panX, this.panY);
    g.scale(this.zoom);
    g.strokeWeight(1);
    const visibleWidth = g.width / this.zoom;
    const start = Math.floor((0 - this.origin.x - this.panX) / CONFIG.unitX);
    const end = Math.ceil((visibleWidth - this.origin.x - this.panX) / CONFIG.unitX);
    for (let xu = start; xu <= end; xu++) {
      const x = this.origin.x + xu * CONFIG.unitX;
      const is12 = mod12(xu) === 0;
      g.stroke(is12 ? CONFIG.colors.grid12 : CONFIG.colors.grid);
      g.line(x, 0, x, g.height);
    }
    g.pop();
  }

  drawEdges(g) {
    g.push();
    g.translate(this.panX, this.panY);
    g.scale(this.zoom);
    for (const e of this.edges) {
      const active = e.a.isActive(this.selectedPcs) && e.b.isActive(this.selectedPcs);
      e.draw(g, active);
    }
    g.pop();
  }

  drawTriangles(g) {
    if (this.debug) {
      g.push();
      g.noStroke();
      g.fill('rgba(255,255,255,0.08)');
      for (const [a, b, c] of this.triangles) {
        g.triangle(a.px, a.py, b.px, b.py, c.px, c.py);
      }
      g.pop();
    }
    g.push();
    g.translate(this.panX, this.panY);
    g.scale(this.zoom);
    g.noStroke();
    g.fill(CONFIG.colors.triangleFill);
    for (const [a, b, c] of this.triangles) {
      if (a.isActive(this.selectedPcs) && b.isActive(this.selectedPcs) && c.isActive(this.selectedPcs)) {
        g.triangle(a.px, a.py, b.px, b.py, c.px, c.py);
      }
    }
    g.pop();
  }

  drawNodes(g) {
    g.push();
    g.translate(this.panX, this.panY);
    g.scale(this.zoom);
    for (const [, n] of this.nodes) {
      const isActive = n.isActive(this.selectedPcs);
      const isTonic = n.pc === this.keyPc;
      const isRoot = this.isRoot(n);
      n.draw(g, isActive, isTonic, isRoot);
    }
    g.pop();
  }

  // --- Interaction spatiale ---
  canvasToZoomed(x, y) {
  return {
    x: (x - this.panX) / this.zoom,
    y: (y - this.panY) / this.zoom
  };
}


findNodeAt(mx, my) {
  const { x, y } = this.canvasToZoomed(mx, my);
  let nearestNode = null;
  let minDist = CONFIG.nodeRadius + 2;

  for (const [, n] of this.nodes) {
    const dx = x - n.px;
    const dy = y - n.py;
    const dist = Math.hypot(dx, dy);
    if (dist <= minDist) {
      minDist = dist;
      nearestNode = n;
    }
  }
  return nearestNode;
}

}
