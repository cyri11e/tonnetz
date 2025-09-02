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

    // Méthode principale appelée partout
    build() {
        this.buildFromEdges(); // ← nouvelle version par défaut
        this.filterByScale();
        console.log(`🔺 ChordTriangle: ${this.triangles.length}/${this.trianglesAll.length} triangles dans la gamme`);
    }
    
    static buildTriangle(a, b, c, gamme) {
        const nodes = [a, b, c];

        // Détection du type (majeur ou mineur) via orientation verticale
        const ys = nodes.map(n => n.py).sort((y1, y2) => y1 - y2);
        const isUpward = ys[1] < (ys[0] + ys[2]) / 2;
        const type = isUpward ? 'min' : 'maj';

        // Centre visuel du triangle
        const cx = (a.px + b.px + c.px) / 3;
        const cy = (Math.min(a.py, b.py, c.py) + Math.max(a.py, b.py, c.py)) / 2;

        // Milieu de la base (pour le label)
        const leftmost = nodes.reduce((min, n) => (n.px < min.px ? n : min));
        const rightmost = nodes.filter(n => n !== leftmost).reduce((max, n) => (n.px > max.px ? n : max));
        const baseX = (leftmost.px + rightmost.px) / 2;
        const baseY = (leftmost.py + rightmost.py) / 2;

        // Nom de fondamentale
        let displayName = leftmost.name;
        if (typeof gamme?.getNoteName === 'function') {
            displayName = gamme.getNoteName(leftmost.pc) ?? leftmost.name;
        }

        // Label texte
        const label = `${displayName} ${type === 'min' ? 'min' : 'MAJ'}`;

        // Chiffre romain
        let numeral = '';
        if (gamme) {
            const relChroma = mod12(leftmost.pc - gamme.tonicPc);
            const degreeLabel = gamme.getLabel(relChroma);
            numeral = getRomanNumeral(degreeLabel, type);
        }

        return {
            nodes,
            type,
            isUpward,
            center: { x: cx, y: cy },
            baseMidpoint: { x: baseX, y: baseY },
            label,
            numeral
        };
    }

    // Mise à jour de la gamme active
    setGamme(gamme) {
        this.gamme = gamme;
        this.filterByScale();
    }

    buildFromEdges() {
        this.trianglesAll = [];
        const seen = new Set();

        const idOf = (n) => `${n.i},${n.j}`;
        const keyOfTri = (a, b, c) => [idOf(a), idOf(b), idOf(c)].sort().join('|');

        for (let i = 0; i < this.edges.length; i++) {
            for (let j = i + 1; j < this.edges.length; j++) {
                const e1 = this.edges[i];
                const e2 = this.edges[j];

                // Cherche un nœud partagé
                const shared = [e1.a, e1.b].find(n => n === e2.a || n === e2.b);
                if (!shared) continue;

                const other1 = e1.a === shared ? e1.b : e1.a;
                const other2 = e2.a === shared ? e2.b : e2.a;

                // Vérifie si une arête relie les deux extrémités restantes
                const e3 = this.edges.find(e =>
                    (e.a === other1 && e.b === other2) || (e.a === other2 && e.b === other1)
                );

                if (e3) {
                    const key = keyOfTri(shared, other1, other2);
                    if (!seen.has(key)) {
                        seen.add(key);
                        const tri = ChordTriangle.buildTriangle(shared, other1, other2, this.gamme);
                        this.trianglesAll.push(tri);

                    }
                }
            }
        }

        this.filterByScale();
        console.log(`🔺 buildFromEdges → ${this.triangles.length}/${this.trianglesAll.length} triangles dans la gamme`);
    }


    // Détection des triangles harmoniques dans le réseau
    buildFromNodes() {
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

        this._buildSpecialTriads();
        this.filterByScale(); // applique le filtre de gamme
        console.log(`🔺 ChordTriangle: ${this.triangles.length}/${this.trianglesAll.length} triangles dans la gamme`);
    }

    _buildSpecialTriads() {
        console.log('🔧 Détection des triades spéciales (aug/dim)...');

        const seen = new Set();
        const idOf = (n) => `${n.i},${n.j}`;
        let countBefore = this.trianglesAll.length;
        let countAdded = 0;

        const pushSpecial = (a, b, c, type) => {
            const key = [idOf(a), idOf(b), idOf(c)].sort().join('|');
            if (!seen.has(key)) {
                seen.add(key);
                this.trianglesAll.push([a, b, c]); // Tu peux enrichir ici avec { nodes: [...], type }
                countAdded++;
            }
        };

        for (const [, node] of this.nodes) {
            const { i, j } = node;

            // Triade augmentée : M3 + M3
            const nU = this.get(i + 1, j);
            const nUU = this.get(i + 2, j);
            if (nU && nUU) {
                pushSpecial(node, nU, nUU, 'aug');
            }

            // Triade diminuée : m3 + m3
            const nV = this.get(i, j + 1);
            const nVV = this.get(i, j + 2);
            if (nV && nVV) {
                pushSpecial(node, nV, nVV, 'dim');
            }
        }

        const countAfter = this.trianglesAll.length;
        console.log(`🔺 Triades spéciales ajoutées: ${countAdded}`);
        console.log(`📊 Total triangles après ajout: ${countAfter} (avant: ${countBefore})`);
    }


    // Filtrage des triangles selon la gamme active
filterByScale() {
  console.log("🎼 Filtrage des triangles selon gamme:", this.gamme.pitchClasses);
  console.log("Avant filtrage:", this.trianglesAll.length);

  this.triangles = this.trianglesAll.filter(tri =>
    tri.nodes.every(n => this.gamme.pitchClasses.includes(n.pc))
  );

  console.log("Après filtrage:", this.triangles.length);
}


    // Affichage des triangles (visuel + texte)
    // Version sans filtrage dynamique : on dessine uniquement this.triangles
draw(g, zoom, gamme, activePcs) {
  g.push();

  for (const tri of this.triangles) {
    const [a, b, c] = tri.nodes;

    const isActive =
      !!activePcs &&
      activePcs.has(a.pc) &&
      activePcs.has(b.pc) &&
      activePcs.has(c.pc);

    // Couleur selon type
    const baseColor = tri.type === 'min'
      ? CONFIG.colors.triangleMinor
      : CONFIG.colors.triangleMajor;

    const col = g.color(baseColor);
    col.setAlpha(isActive ? 200 : 80);

    g.noStroke();
    g.fill(col);
    g.triangle(a.px, a.py, b.px, b.py, c.px, c.py);

    // Label texte (nom de l’accord)
    const verticalOffset = CONFIG.fontSize * (tri.type === 'min' ? 0.5 : -0.4) * zoom;
    const labelText = zoom < 0.7 ? '' :
      zoom < 1 ? tri.label.slice(0, 2) :
      zoom < 1.2 ? tri.label :
      `${tri.label}`;

    if (labelText) {
      g.push();
      g.textAlign(CENTER, CENTER);
      g.textSize(CONFIG.fontSize * 0.75 * zoom);
      g.textFont(CONFIG.fontFamily);
      g.fill(CONFIG.colors.chordDisplay);
      g.text(labelText, tri.baseMidpoint.x, tri.baseMidpoint.y + verticalOffset);
      g.pop();
    }

    // Chiffre romain
    if (tri.numeral) {
      g.push();
      g.textAlign(CENTER, CENTER);
      g.textSize(CONFIG.fontSize * 1.5 * zoom);
      g.textFont(CONFIG.fontFamilyRoman);
      g.textStyle(BOLD);
      g.fill(CONFIG.colors.bg);
      g.text(tri.numeral, tri.center.x, tri.center.y);
      g.pop();
    }

    // Réaccentuation si actif
    if (isActive) {
      g.push();
      g.textAlign(CENTER, CENTER);
      g.textFont(CONFIG.fontFamily);
      g.textSize(CONFIG.fontSize * 0.75 * zoom);
      const labelColor = g.color(CONFIG.colors.nodeLabel);
      labelColor.setAlpha(250);
      g.fill(labelColor);
      g.noStroke();
      if (labelText) g.text(labelText, tri.baseMidpoint.x, tri.baseMidpoint.y + verticalOffset);
      g.pop();

      if (tri.numeral) {
        g.push();
        g.textAlign(CENTER, CENTER);
        g.textFont(CONFIG.fontFamilyRoman);
        g.textSize(CONFIG.fontSize * 1.5 * zoom);
        const romanColor = g.color(CONFIG.colors.nodeLabel);
        romanColor.setAlpha(250);
        g.fill(romanColor);
        g.noStroke();
        g.text(tri.numeral, tri.center.x, tri.center.y);
        g.pop();
      }
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
    isActive(tri, activePcs) {
        const [a, b, c] = tri;
        return activePcs.has(a.pc) &&
            activePcs.has(b.pc) &&
            activePcs.has(c.pc);
    }

}
