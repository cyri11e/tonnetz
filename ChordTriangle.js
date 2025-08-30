class ChordTriangle {
  constructor(nodes, edges, getNode) {
    this.nodes = nodes;       // Map des nœuds (clé : "i,j")
    this.edges = edges;       // Liste des arêtes musicales (IntervalEdge)
    this.get = getNode;       // Méthode pour accéder à un nœud via (i, j)
    this.triangles = [];      // Liste finale des triangles détectés
  }

  build() {
    this.triangles = [];
    const seen = new Set(); // Pour éviter les doublons

    // Génère une clé unique pour un nœud
    const idOf = (n) => `${n.i},${n.j}`;

    // Vérifie si deux nœuds sont connectés par une arête
    const areNeighbors = (n1, n2) =>
      this.edges.some(e => (e.a === n1 && e.b === n2) || (e.a === n2 && e.b === n1));

    // Ajoute un triangle si ses trois sommets sont connectés
    const pushTri = (a, b, c) => {
      const key = [idOf(a), idOf(b), idOf(c)].sort().join('|');
      if (!seen.has(key)) {
        seen.add(key);
        this.triangles.push([a, b, c]);
      }
    };

    // Parcours tous les nœuds pour détecter les triangles valides
    for (const [, node] of this.nodes) {
      const { i, j } = node;

      // Voisins dans les trois directions musicales
      const nU = this.get(i + 1, j);       // M3
      const nV = this.get(i, j + 1);       // m3
      const nQ = this.get(i + 1, j - 1);   // P5
      const pU = this.get(i - 1, j);       // -M3
      const pV = this.get(i, j - 1);       // -m3
      const pQ = this.get(i - 1, j + 1);   // -P5

      // Teste les combinaisons de triangles valides
      if (nU && nQ && areNeighbors(node, nU) && areNeighbors(node, nQ) && areNeighbors(nU, nQ)) pushTri(node, nU, nQ);
      if (nV && nQ && areNeighbors(node, nV) && areNeighbors(node, nQ) && areNeighbors(nV, nQ)) pushTri(node, nV, nQ);
      if (pU && pQ && areNeighbors(node, pU) && areNeighbors(node, pQ) && areNeighbors(pU, pQ)) pushTri(node, pU, pQ);
      if (pV && pQ && areNeighbors(node, pV) && areNeighbors(node, pQ) && areNeighbors(pV, pQ)) pushTri(node, pV, pQ);
    }
  }
  draw(g, zoom, gamme) {
  if (!gamme || !Array.isArray(gamme.pitchClasses)) return;

  g.push();
  for (const tri of this.triangles) {
    if (!tri || tri.length !== 3) continue;
    const [a, b, c] = tri;

    // Vérifie que les trois sommets sont dans la gamme
    const inGamme =
      gamme.pitchClasses.includes(a.pc) &&
      gamme.pitchClasses.includes(b.pc) &&
      gamme.pitchClasses.includes(c.pc);

    if (!inGamme) continue;

    // Orientation du triangle (mineur = vers le haut)
    const ys = [a.py, b.py, c.py].sort((a, b) => a - b);
    const isUpward = ys[1] < (ys[0] + ys[2]) / 2;
    const type = isUpward ? 'min' : 'maj';

    // Couleur de fond
    const baseColor = isUpward ? CONFIG.colors.edgem3 : CONFIG.colors.edgeM3;
    const col = g.color(baseColor);
    col.setAlpha(100);
    g.fill(col);
    g.triangle(a.px, a.py, b.px, b.py, c.px, c.py);

    // Détermination de la fondamentale graphique
    const leftmost = [a, b, c].reduce((min, node) => node.px < min.px ? node : min);
    const others = [a, b, c].filter(n => n !== leftmost);
    const rightmost = others.reduce((max, node) => node.px > max.px ? node : max);

    const baseX = (leftmost.px + rightmost.px) / 2;
    const baseY = (leftmost.py + rightmost.py) / 2;
    const verticalOffset = CONFIG.fontSize * (type === 'min' ? 0.5 : -0.4) * zoom;

    // Nom d’accord
    let displayName = leftmost.name;
    if (typeof gamme.getNoteName === 'function') {
      displayName = gamme.getNoteName(leftmost.pc) ?? leftmost.name;
    }

    let labelText = '';
    if (zoom < 0.7) {
      labelText = '';
    } else if (zoom < 1) {
      labelText = `${displayName[0]}${type === 'min' ? 'm' : 'M'}`;
    } else if (zoom < 1.2) {
      labelText = `${displayName}${type === 'min' ? 'm' : 'M'}`;
    } else {
      labelText = `${displayName} ${type === 'min' ? 'min' : 'MAJ'}`;
    }

    if (labelText) {
      g.fill(baseColor);
      g.textFont(CONFIG.fontFamily);
      g.textAlign(CENTER, CENTER);
      g.textSize(CONFIG.fontSize * 0.75 * zoom);
      g.text(labelText, baseX, baseY + verticalOffset);
    }

    // Chiffre romain
    const relChroma = mod12(leftmost.pc - gamme.tonicPc);
    const degreeLabel = gamme.getLabel(relChroma);
    const numeral = getRomanNumeral(degreeLabel, type);

    const cx = (a.px + b.px + c.px) / 3;
    const cy = (Math.min(a.py, b.py, c.py) + Math.max(a.py, b.py, c.py)) / 2;

    g.textFont(CONFIG.fontFamilyRoman);
    g.textAlign(CENTER, CENTER);
    g.textSize(CONFIG.fontSize * 1.5 * zoom);
    g.fill(CONFIG.colors.selectedNodeFill);
    g.text(numeral, cx, cy);
  }
  g.pop();
}

}
