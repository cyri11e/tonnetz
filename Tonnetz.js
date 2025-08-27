class Tonnetz {
  constructor({ startNote = 'C', H = 8, Vn = 6, canvas, debug = true }) {
    this.startPc = nameToPc(startNote);
    this.H = H;
    this.Vn = Vn;
    this.canvas = canvas;
    this.debug = debug;

    this.gamme = new Gamme();

    this.origin = { x: canvas.width / 2, y: canvas.height / 2 };

    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;

    this.selectedPcs = new Set();
    this.activeMidiNums = [];
    this.chordDetector = new ChordDetector();
    this.noteStyle = 'mixed';
    NOTE_NAMES = ENHARMONIC_MAPS[this.noteStyle];
    this.keyNote = 'C';
    this.keyPc = nameToPc(this.keyNote);

    this.nodes = new Map();
    this.edges = [];
    this.triangles = [];

    this.buildNodes();
    this.buildEdges();
    this.buildTriangles();
    this.updateNodePositions();
  }

  key(i, j) { return `${i},${j}`; }
  get(i, j) { return this.nodes.get(this.key(i, j)); }

  setKey(noteName) {
    this.keyNote = noteName;
    this.keyPc = nameToPc(noteName);
    console.log(`🎯 Tonique changée : ${this.keyNote} (pc=${this.keyPc})`);
  }

  // buildNodes() {
  //   this.nodes.clear();
  //   for (let s = -this.Vn; s <= this.Vn; s++) {
  //     for (let i = -this.H; i <= this.H; i++) {
  //       const j = s - i;
  //       const xu = i * U.x + j * V.x;
  //       const yu = i * U.y + j * V.y;
  //       const pc = mod12(this.startPc + xu);
  //       const node = {
  //         i, j, xu, yu, pc,
  //         name: pcToName(pc),
  //         manualSelected: false,
  //         lastActiveTime: 0,
  //         px: 0, py: 0
  //       };
  //       this.nodes.set(this.key(i, j), node);
  //     }
  //   }
  // } ancienne version qui gereait pas les methodes de NoteNode mais un objet literal

  buildNodes() {
    this.nodes.clear();
    for (let s = -this.Vn; s <= this.Vn; s++) {
      for (let i = -this.H; i <= this.H; i++) {
        const j = s - i;
        const node = new NoteNode(i, j, this.origin, this.startPc);
        this.nodes.set(this.key(i, j), node);
      }
    }
  } // nouvelle version avec NoteNode.js
  
buildEdges() {
  this.edges = [];
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
      const k = [idOf(a), idOf(b), idOf(c)].sort().join('|');
      if (!seen.has(k)) { seen.add(k); this.triangles.push([a, b, c]); }
    };
    const areNeighbors = (n1, n2) =>
      this.edges.some(e => (e.a === n1 && e.b === n2) || (e.a === n2 && e.b === n1));

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

  updateNodePositions() {
    for (const [, n] of this.nodes) {
      n.px = this.origin.x + this.panX + (n.xu * CONFIG.unitX) * this.zoom;
      n.py = this.origin.y + this.panY - (n.yu * CONFIG.unitY) * this.zoom;
    }
  }

clampPan() {
  // 1. Trouver les coordonnées extrêmes des nœuds (après zoom, sans pan)
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const [, n] of this.nodes) {
    const px = (n.xu * CONFIG.unitX) * this.zoom;
    const py = (-n.yu * CONFIG.unitY) * this.zoom;
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  }

  // 2. Calculer les limites de pan pour que le parallélogramme reste dans l'écran
  const viewW = this.canvas.width;
  const viewH = this.canvas.height;

  const minPanX = viewW - (this.origin.x + maxX);
  const maxPanX = this.origin.x - minX;
  const minPanY = viewH - (this.origin.y + maxY);
  const maxPanY = this.origin.y - minY;

  // 3. Appliquer les limites
  this.panX = Math.max(minPanX, Math.min(maxPanX, this.panX));
  this.panY = Math.max(minPanY, Math.min(maxPanY, this.panY));
}



pan(dx, dy) {
  this.panX += dx;
  this.panY += dy;
  this.clampPan();
  this.updateNodePositions();
}

zoomAt(mx, my, factor) {
  let newZoom = this.zoom * factor;
  newZoom = Math.max(0.6, Math.min(2, newZoom));

  const worldX = (mx - this.origin.x - this.panX) / this.zoom;
  const worldY = (my - this.origin.y - this.panY) / this.zoom;

  this.zoom = newZoom;

  this.panX = mx - this.origin.x - worldX * this.zoom;
  this.panY = my - this.origin.y - worldY * this.zoom;

  this.clampPan();
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
      const x = this.origin.x + this.panX + xu * CONFIG.unitX * this.zoom;
      const is12 = mod12(xu) === 0;
      g.stroke(is12 ? CONFIG.colors.grid12 : CONFIG.colors.grid);
      g.line(x, 0, x, this.canvas.height);
    }
  }

drawEdges(g) {
  for (const edge of this.edges) {
    const active = edge.isActive(this.selectedPcs);
    edge.draw(g, active, this.zoom);
  }
}


  drawTriangles(g) {
    g.noStroke();
    g.fill(CONFIG.colors.triangleFill);
    for (const [a, b, c] of this.triangles) {
      if (this.selectedPcs.has(a.pc) && this.selectedPcs.has(b.pc) && this.selectedPcs.has(c.pc)) {
        g.triangle(a.px, a.py, b.px, b.py, c.px, c.py);
      }
    }
  }

 drawNodes(g) {
  for (const [, node] of this.nodes) {
    const isActive = node.isActive(this.selectedPcs);
    const isTonic  = node.pc === this.keyPc;
    const isRoot   = this.isRoot(node);
    const inGamme  = this.gamme?.chroma.includes(node.pc) || false;
    const zoom     = this.zoom;

    // On transmet le contexte et tous les états
    node.draw(g, isActive, isTonic, isRoot, inGamme, zoom);
  }
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

  getActiveNotes() {
    const activeNotes = [];
    for (const [, node] of this.nodes) {
      if (this.selectedPcs.has(node.pc)) activeNotes.push(node.name);
    }
    return [...new Set(activeNotes)];
  }

  setMidiNotes(notes, midiNums) {
    const signature = (midiNums || []).slice().sort((a,b) => a - b).join(',');
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
