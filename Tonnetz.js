class Tonnetz {
  constructor({ startNote ='G', H = 8, Vn = 6, canvas, debug = true }) {
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
    this.gamme.setTonic(noteName);
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

  // affichage des triangles représentant les accords majeurs et mineurs
drawTriangles(g) {
  g.push();
  for (const tri of this.triangles) {
    if (!tri || tri.length !== 3) continue;
    const [a, b, c] = tri;

    const inGamme =
      this.gamme.pitchClasses.includes(a.pc) &&
      this.gamme.pitchClasses.includes(b.pc) &&
      this.gamme.pitchClasses.includes(c.pc);

    if (!inGamme) continue;

    const ys = [a.py, b.py, c.py].sort((a, b) => a - b);
    const isUpward = ys[1] < (ys[0] + ys[2]) / 2;

    const baseColor = isUpward
      ? CONFIG.colors.edgem3
      : CONFIG.colors.edgeM3;

    const col = g.color(baseColor);
    col.setAlpha(100);
    g.fill(col);
    g.triangle(a.px, a.py, b.px, b.py, c.px, c.py);

    this.drawChordLabel(g, tri); // ← affichage du label séparé
  }
  g.pop();
}

drawChordLabel(g, tri) {
  const [a, b, c] = tri;

  const inGamme =
    this.gamme.pitchClasses.includes(a.pc) &&
    this.gamme.pitchClasses.includes(b.pc) &&
    this.gamme.pitchClasses.includes(c.pc);

  if (!inGamme) return;

  const ys = [a.py, b.py, c.py].sort((a, b) => a - b);
  const isUpward = ys[1] < (ys[0] + ys[2]) / 2;
  const type = isUpward ? 'min' : 'maj';

  const leftmost = [a, b, c].reduce((min, node) =>
    node.px < min.px ? node : min
  );
  const others = [a, b, c].filter(n => n !== leftmost);
  const rightmost = others.reduce((max, node) =>
    node.px > max.px ? node : max
  );

  const baseX = (leftmost.px + rightmost.px) / 2;
  const baseY = (leftmost.py + rightmost.py) / 2;
  const verticalOffset = CONFIG.fontSize * (type === 'min' ? 0.5 : -0.4) * this.zoom;
  const labelX = baseX;
  const labelY = baseY + verticalOffset;

  let displayName = leftmost.name;
  if (this.gamme && typeof this.gamme.getNoteName === 'function') {
    displayName = this.gamme.getNoteName(leftmost.pc) ?? leftmost.name;
  }

  let labelText = '';
  if (this.zoom < 0.7) {
    labelText = '';
  } else if (this.zoom < 1) {
    labelText = `${displayName[0]}${type === 'min' ? 'm' : 'M'}`;
  } else if (this.zoom < 1.2) {
    labelText = `${displayName}${type === 'min' ? 'm' : 'M'}`;
  } else {
    labelText = `${displayName} ${type === 'min' ? 'min' : 'MAJ'}`;
  }

  if (labelText) {
    const baseColor = isUpward
      ? CONFIG.colors.edgem3
      : CONFIG.colors.edgeM3;

    g.fill(baseColor);
    g.textAlign(CENTER, CENTER);
    g.textSize(CONFIG.fontSize * 0.75 * this.zoom);
    g.text(labelText, labelX, labelY);
  }
}


  drawNodes(g) {
    for (const [, node] of this.nodes) {
      const isActive = node.isActive(this.selectedPcs);
      const isTonic  = node.pc === this.keyPc;
      const isRoot   = this.isRoot(node);
      const inGamme  = this.gamme?.pitchClasses.includes(node.pc) || false;

      const zoom     = this.zoom;

      // On transmet le contexte et tous les états
      node.draw(g, isActive, isTonic, isRoot, inGamme, zoom, this.gamme);

    }
  }

  // draw principal 
  draw(g) {
    g.push();
    g.background(CONFIG.colors.bg);

    this.drawGrid(g);
    this.drawTriangles(g);
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
