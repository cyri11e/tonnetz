class ChordTriangle {
  constructor(nodes, edges, getNode, gamme) {
    // Références au réseau harmonique
    this.nodes = nodes;       // Map des nœuds (clé : "i,j")
    this.edges = edges;       // Liste des arêtes musicales (IntervalEdge)
    this.get = getNode;       // Méthode pour accéder à un nœud via (i, j)
    this.gamme = gamme;       // Gamme active (pour filtrer les accords)

    // Stockage des triangles
    this.trianglesAll = [];   // Tous les triangles géométriques détectés
    this.triangles = [];      // Triangles filtrés selon la gamme
  }

  // Mise à jour de la gamme active
  setGamme(gamme) {
    this.gamme = gamme;
    this.filterByScale(); // met à jour les triangles filtrés
  }

  // Détection des triangles harmoniques dans le réseau
  build() {
    this.trianglesAll = [];
    const seen = new Set(); // pour éviter les doublons

    const idOf = (n) => `${n.i},${n.j}`; // identifiant unique d’un nœud
    const areNeighbors = (n1, n2) =>
      this.edges.some(e => (e.a === n1 && e.b === n2) || (e.a === n2 && e.b === n1));

    const pushTri = (a, b, c) => {
      const key = [idOf(a), idOf(b), idOf(c)].sort().join('|');
      if (!seen.has(key)) {
        seen.add(key);
        this.trianglesAll.push([a, b, c]);
      }
    };

    // Parcours de tous les nœuds pour détecter les triangles valides
    for (const [, node] of this.nodes) {
      const { i, j } = node;

      // Voisins dans les directions musicales
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

    this.filterByScale(); // applique le filtre de gamme
    console.log(`🔺 ChordTriangle: ${this.triangles.length}/${this.trianglesAll.length} triangles dans la gamme`);
  }

  // Filtrage des triangles selon la gamme active
  filterByScale() {
    if (!this.gamme || !Array.isArray(this.gamme.pitchClasses)) {
      this.triangles = this.trianglesAll.slice();
      return;
    }
    const pcs = this.gamme.pitchClasses;
    this.triangles = this.trianglesAll.filter(([a, b, c]) =>
      pcs.includes(a.pc) && pcs.includes(b.pc) && pcs.includes(c.pc)
    );
  }

  // Affichage des triangles (visuel + texte)
 draw(g, zoom, gamme, activePcs) {
  g.push();

  for (const tri of this.trianglesAll) {
    const [a, b, c] = tri;

    // État harmonique
    const inGamme = gamme?.pitchClasses?.includes(a.pc) &&
                    gamme?.pitchClasses?.includes(b.pc) &&
                    gamme?.pitchClasses?.includes(c.pc);

    const active = activePcs?.has(a.pc) &&
                   activePcs?.has(b.pc) &&
                   activePcs?.has(c.pc);

    if (!inGamme && !active) continue;

    // Orientation du triangle
    const ys = [a.py, b.py, c.py].sort((a, b) => a - b);
    const isUpward = ys[1] < (ys[0] + ys[2]) / 2;
    const type = isUpward ? 'min' : 'maj';

    // Couleur de base
    const baseColor = isUpward
      ? CONFIG.colors.triangleMinor
      : CONFIG.colors.triangleMajor;

    const col = g.color(baseColor);
    col.setAlpha(active ? 180 : 100);
    g.fill(col);
    g.triangle(a.px, a.py, b.px, b.py, c.px, c.py);

    // Fond animé si actif hors gamme
    if (active && !inGamme) {
      g.push();
      const bg = g.color(CONFIG.colors.bg);
      bg.setAlpha(100);
      g.fill(bg);
      g.noStroke();
      g.triangle(a.px, a.py, b.px, b.py, c.px, c.py);
      g.pop();
    }

    // Position du label
    const leftmost = [a, b, c].reduce((min, node) => node.px < min.px ? node : min);
    const others = [a, b, c].filter(n => n !== leftmost);
    const rightmost = others.reduce((max, node) => node.px > max.px ? node : max);

    const baseX = (leftmost.px + rightmost.px) / 2;
    const baseY = (leftmost.py + rightmost.py) / 2;
    const verticalOffset = CONFIG.fontSize * (type === 'min' ? 0.5 : -0.4) * zoom;

    // Nom de la fondamentale (recalculé via gamme)
    let displayName = leftmost.name;
    if (typeof gamme?.getNoteName === 'function') {
      displayName = gamme.getNoteName(leftmost.pc) ?? leftmost.name;
    }

    // Texte du label selon zoom
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

    // Chiffre romain (fonction tonale)
    let numeral = '';
    if (inGamme && gamme) {
      const relChroma = mod12(leftmost.pc - gamme.tonicPc);
      const degreeLabel = gamme.getLabel(relChroma);
      numeral = getRomanNumeral(degreeLabel, type);
    }

    const cx = (a.px + b.px + c.px) / 3;
    const cy = (Math.min(a.py, b.py, c.py) + Math.max(a.py, b.py, c.py)) / 2;

    // Affichage du label
    if (labelText) {
      g.push();
      g.textAlign(CENTER, CENTER);
      g.textSize(CONFIG.fontSize * 0.75 * zoom);
      g.textFont(CONFIG.fontFamily);
      g.fill(CONFIG.colors.chordDisplay);
      g.text(labelText, baseX, baseY + verticalOffset);
      g.pop();
    }

    // Affichage du chiffre romain
    if (numeral) {
      g.push();
      g.textAlign(CENTER, CENTER);
      g.textSize(CONFIG.fontSize * 1.5 * zoom);
      g.textFont(CONFIG.fontFamilyRoman);
      g.textStyle(BOLD)
      g.fill(CONFIG.colors.bg);
      g.text(numeral, cx, cy + CONFIG.fontSize * 0.6 * zoom);
      //drawRomanNumeral(g, numeral, cx + zoom * ( type === 'min' ? 0.9 : 1 ), cy + CONFIG.fontSize * 0.6 * zoom * ( type === 'min' ? 0.4 : 1 ), zoom);

      g.pop();
    }

    // Réaffichage dynamique si actif
    if (active) {
      g.push();
      g.textAlign(CENTER, CENTER);
      g.textFont(CONFIG.fontFamily);
      g.textSize(CONFIG.fontSize * 0.75 * zoom);
      const labelColor = g.color(CONFIG.colors.nodeLabel);
      labelColor.setAlpha(200);
      g.fill(labelColor);
      g.noStroke();
      g.text(labelText, baseX, baseY + verticalOffset);
      g.pop();

      g.push();
      g.textAlign(CENTER, CENTER);
      g.textFont(CONFIG.fontFamilyRoman);
      g.textSize(CONFIG.fontSize * 1.5 * zoom);
      const romanColor = g.color(CONFIG.colors.degreeLabel);
      romanColor.setAlpha(200);
      g.fill(romanColor);
      g.noStroke();
      g.text(numeral, cx, cy);
      g.pop();
    }
  }

  g.pop();
}


  isInGamme(tri, gamme) {
  if (!gamme || !Array.isArray(gamme.pitchClasses)) return false;
  const [a, b, c] = tri;
  return gamme.pitchClasses.includes(a.pc) &&
         gamme.pitchClasses.includes(b.pc) &&
         gamme.pitchClasses.includes(c.pc);
}
isActive(tri, selectedPcs) {
  const [a, b, c] = tri;
  return selectedPcs.has(a.pc) &&
         selectedPcs.has(b.pc) &&
         selectedPcs.has(c.pc);
}

}
