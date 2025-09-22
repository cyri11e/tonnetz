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
  let count = 0;

  for (let s = -this.Vn; s <= this.Vn; s++) {
    for (let i = -this.H; i <= this.H; i++) {
      const j = s - i;
      const node = new NoteNode(i, j, this.origin, this.startPc);
      this.nodes.set(this.key(i, j), node);
      count++;
    }
  }
  console.log(`🧩 buildNodes → ${count} nœuds créés`);
}


buildEdges() {
  this.edges = [];

  for (const [, node] of this.nodes) {
    const { i, j } = node;

    const directions = [
      { ni: i + 1, nj: j, type: 'M3' },
      { ni: i,     nj: j + 1, type: 'm3' },
      { ni: i + 1, nj: j - 1, type: 'P5' }
    ];

    for (const { ni, nj, type } of directions) {
      const neighbor = this.get(ni, nj);
      if (!neighbor) continue;

      const edge = IntervalEdge.build(node, neighbor, type);
      if (edge) this.edges.push(edge);
    }
  }

  console.log(`🔗 buildEdges → ${this.edges.length} arêtes créées`);
}


  // Détection des triangles formés par des arêtes connectées
  buildTriangles() {
    this.chordTriangle = new ChordTriangle(this.nodes, this.edges, this.get.bind(this), this.gamme);
    //this.chordTriangle.buildFromEdges();
    this.chordTriangle.build();
  }

}
