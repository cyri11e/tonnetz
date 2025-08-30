class NetGrid {
  constructor({ H = 8, Vn = 4, origin, startPc, gamme }) {
    // Dimensions horizontale et diagonale du réseau
    this.H = H;       // Nombre de colonnes de part et d'autre du centre
    this.Vn = Vn;     // Nombre de diagonales (somme i + j) autour du centre

    // Origine du dessin (centre du canvas)
    this.origin = origin;

    // Pitch class de départ (ex: G = 7)
    this.startPc = startPc;

    // Gamme active (pour filtrer les accords valides)
    this.gamme = gamme;

    // Structures principales
    this.nodes = new Map();     // Tous les nœuds du réseau
    this.edges = [];            // Connexions entre nœuds (M3, m3, P5)
    this.triangles = [];        // Triangles formés par les arêtes

    // Construction initiale
    this.buildNodes();
    this.buildEdges();
    this.buildTriangles();
  }

  // Génère une clé unique pour chaque nœud (coordonnées i,j)
  key(i, j) {
    return `${i},${j}`;
  }

  // Accès direct à un nœud via ses coordonnées
  get(i, j) {
    return this.nodes.get(this.key(i, j));
  }

  // Création des nœuds du réseau
  buildNodes() {
    this.nodes.clear();
    for (let s = -this.Vn; s <= this.Vn; s++) {
      for (let i = -this.H; i <= this.H; i++) {
        const j = s - i; // Maintient la diagonale constante (i + j = s)
        const node = new NoteNode(i, j, this.origin, this.startPc);
        this.nodes.set(this.key(i, j), node);
      }
    }
  }

  // Création des arêtes entre nœuds voisins
  buildEdges() {
    this.edges = [];
    for (const [, node] of this.nodes) {
      const { i, j } = node;

      // Voisins dans les trois directions musicales
      const nU = this.get(i + 1, j);     // Tierce majeure (M3)
      const nV = this.get(i, j + 1);     // Tierce mineure (m3)
      const nQ = this.get(i + 1, j - 1); // Quinte juste (P5)

      // Création des arêtes si le voisin existe
      if (nU) this.edges.push(new IntervalEdge(node, nU, 'M3'));
      if (nV) this.edges.push(new IntervalEdge(node, nV, 'm3'));
      if (nQ) this.edges.push(new IntervalEdge(node, nQ, 'P5'));
    }
  }

  // Détection des triangles formés par des arêtes connectées
  buildTriangles() {
    this.triangles = [];

    const seenTri = new Set(); // Pour éviter les doublons
    const idOf = (n) => this.key(n.i, n.j); // Identifiant unique d’un nœud

    // Ajoute un triangle si non déjà vu
    const pushTri = (a, b, c) => {
      const k = [idOf(a), idOf(b), idOf(c)].sort().join('|');
      if (!seenTri.has(k)) {
        seenTri.add(k);
        this.triangles.push([a, b, c]);
      }
    };

    // Vérifie si deux nœuds sont reliés par une arête
    const areNeighbors = (n1, n2) =>
      this.edges.some(e => (e.a === n1 && e.b === n2) || (e.a === n2 && e.b === n1));

    // Parcours tous les nœuds pour détecter les triangles
    for (const [, node] of this.nodes) {
      const { i, j } = node;

      // Voisins dans les directions musicales
      const nU = this.get(i + 1, j);
      const nV = this.get(i, j + 1);
      const nQ = this.get(i + 1, j - 1);
      const pU = this.get(i - 1, j);
      const pV = this.get(i, j - 1);
      const pQ = this.get(i - 1, j + 1);

      // Teste les combinaisons de triangles valides
      if (nU && nQ && areNeighbors(node, nU) && areNeighbors(node, nQ) && areNeighbors(nU, nQ)) pushTri(node, nU, nQ);
      if (nV && nQ && areNeighbors(node, nV) && areNeighbors(node, nQ) && areNeighbors(nV, nQ)) pushTri(node, nV, nQ);
      if (pU && pQ && areNeighbors(node, pU) && areNeighbors(node, pQ) && areNeighbors(pU, pQ)) pushTri(node, pU, pQ);
      if (pV && pQ && areNeighbors(node, pV) && areNeighbors(node, pQ) && areNeighbors(pV, pQ)) pushTri(node, pV, pQ);
    }
  }
}
