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
}
