class Tonnetz {
  constructor({ startNote = 'C', H = 8, Vn = 6, canvas, debug = true }) {
    this.startPc = nameToPc(startNote);
    this.H = H;
    this.Vn = Vn;
    this.canvas = canvas;
    this.debug = debug; // mode debug on/off

    this.origin = { x: canvas.width / 2, y: canvas.height / 2 };

    this.nodes = new Map();
    this.edges = [];
    this.triangles = []; // tissu
    this.selectedPcs = new Set();
    this.activeMidiNums = [];  // Stockage des numéros MIDI actifs

    this.chordDetector = new ChordDetector();

    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;

    this.buildNodes();
    this.buildEdges();
    this.buildTriangles();
    this.computeXRange();
  }

  key(i, j) { return `${i},${j}`; }
  get(i, j) { return this.nodes.get(this.key(i, j)); }

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

// Triangles persistants = tissu filtré par intervalles autorisés
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

  const areNeighbors = (n1, n2) => {
    return this.edges.some(e =>
      ((e.a === n1 && e.b === n2) || (e.a === n2 && e.b === n1)) &&
      (e.type === 'P5' || e.type === 'M3' || e.type === 'm3')
    );
  };

  for (const [, node] of this.nodes) {
    const { i, j } = node;

    // Voisins
    const nU = this.get(i + 1, j);
    const nV = this.get(i, j + 1);
    const nQ = this.get(i + 1, j - 1);

    const pU = this.get(i - 1, j);
    const pV = this.get(i, j - 1);
    const pQ = this.get(i - 1, j + 1);

    // On ne garde que les triangles dont toutes les arêtes sont valides
    if (nU && nQ && areNeighbors(node, nU) && areNeighbors(node, nQ) && areNeighbors(nU, nQ)) {
      pushTri(node, nU, nQ);
    }
    if (nV && nQ && areNeighbors(node, nV) && areNeighbors(node, nQ) && areNeighbors(nV, nQ)) {
      pushTri(node, nV, nQ);
    }
    if (pU && pQ && areNeighbors(node, pU) && areNeighbors(node, pQ) && areNeighbors(pU, pQ)) {
      pushTri(node, pU, pQ);
    }
    if (pV && pQ && areNeighbors(node, pV) && areNeighbors(node, pQ) && areNeighbors(pV, pQ)) {
      pushTri(node, pV, pQ);
    }
  }
}



  computeXRange() {
    let minXu = Infinity, maxXu = -Infinity;
    for (const [, n] of this.nodes) {
      minXu = Math.min(minXu, n.xu);
      maxXu = Math.max(maxXu, n.xu);
    }
    this.minXu = minXu;
    this.maxXu = maxXu;
  }

  togglePc(pc) {
    if (this.selectedPcs.has(pc)) this.selectedPcs.delete(pc);
    else this.selectedPcs.add(pc);
  }

  // Triangles reconnus dynamiquement
  getRecognizedTriangles() {
    return this.triangles.filter(([a, b, c]) =>
      a.isActive(this.selectedPcs) &&
      b.isActive(this.selectedPcs) &&
      c.isActive(this.selectedPcs)
    );
  }

  getActiveNotes() {
    const activeNotes = [];
    for (const [, node] of this.nodes) {
      if (node.isActive(this.selectedPcs)) {
        activeNotes.push(node.name);
      }
    }
    return [...new Set(activeNotes)];
  }

  setMidiNotes(notes, midiNums) {
    this.selectedPcs.clear();
    notes.forEach(note => {
      this.selectedPcs.add(nameToPc(note));
    });
    this.activeMidiNums = midiNums || [];
  }

  getDetectedChords() {
    const activeNotes = this.getActiveNotes();
    if (activeNotes.length < 3) return [];
    return this.chordDetector.detect(activeNotes, this.activeMidiNums);
  }

  // Convertit les coordonnées du canvas en coordonnées zoomées
  canvasToZoomed(x, y) {
    return {
      x: (x - this.origin.x - this.panX) / this.zoom + this.origin.x,
      y: (y - this.origin.y - this.panY) / this.zoom + this.origin.y
    };
  }

  drawGrid(g) {
    g.push();
    g.translate(this.panX, this.panY);
    g.scale(this.zoom);
    g.strokeWeight(1);
    for (let xu = this.minXu; xu <= this.maxXu; xu++) {
      const x = this.origin.x + xu * CONFIG.unitX;
      const is12 = mod12(xu) === 0;
      g.stroke(is12 ? CONFIG.colors.grid12 : CONFIG.colors.grid);
      g.line(x, 0, x, g.height);
      if (is12) {
        g.noStroke();
        g.fill(CONFIG.colors.grid12);
        g.textSize(10);
        g.textAlign(CENTER, TOP);
        g.text(`+${xu} st`, x, 4);
      }
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
    // Mode debug : afficher le tissu en arrière-plan
    if (this.debug) {
      g.push();
      g.noStroke();
      g.fill('rgba(255,255,255,0.08)');
      for (const [a, b, c] of this.triangles) {
        g.triangle(a.px, a.py, b.px, b.py, c.px, c.py);
      }
      g.pop();
    }

    // Triangles reconnus
    g.push();
    g.translate(this.panX, this.panY);
    g.scale(this.zoom);
    g.noStroke();
    g.fill(CONFIG.colors.triangleFill);
    for (const [a, b, c] of this.getRecognizedTriangles()) {
      g.triangle(a.px, a.py, b.px, b.py, c.px, c.py);
    }
    g.pop();
  }

// Filigrane du tissu (contours fins, pas de remplissage)
drawTissuTriangles(g) {
  g.push();
  g.noFill();
  g.stroke('rgba(255,255,255,0.12)'); // subtil
  g.strokeWeight(1);
  for (const [a, b, c] of this.triangles) {
    g.triangle(a.px, a.py, b.px, b.py, c.px, c.py);
  }
  g.pop();
}


  drawNodes(g) {
    g.push();
    g.translate(this.panX, this.panY);
    g.scale(this.zoom);
    for (const [, n] of this.nodes) {
      n.draw(g, n.isActive(this.selectedPcs));
    }
    g.pop();
  }

  findNodeAt(mx, my) {
    const {x, y} = this.canvasToZoomed(mx, my);
    for (const [, n] of this.nodes) {
      if (n.contains(x, y)) return n;
    }
    return null;
  }

  isRoot(node) {
    const activeNotes = this.getActiveNotes();
    if (activeNotes.length < 3) return false;
    const chords = this.getDetectedChords();
    return chords.some(chord => chord.root === node.name);
  }
}
