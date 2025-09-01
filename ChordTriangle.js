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
        this.filterByScale();
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
        this.triangles = this.trianglesAll.filter(([a, b, c]) =>
            this.gamme.pitchClasses.includes(a.pc) &&
            this.gamme.pitchClasses.includes(b.pc) &&
            this.gamme.pitchClasses.includes(c.pc)
        );
        console.log("Après filtrage:", this.triangles.length);

    }

    // Affichage des triangles (visuel + texte)
    // Version sans filtrage dynamique : on dessine uniquement this.triangles
    draw(g, zoom, gamme, activePcs) {
        g.push();

        const tris = this.triangles || [];
        for (const tri of tris) {
            const [a, b, c] = tri;

            // État actif (ne filtre pas, sert juste au style)
            const isActive =
                !!activePcs &&
                activePcs.has(a.pc) &&
                activePcs.has(b.pc) &&
                activePcs.has(c.pc);

            // Orientation du triangle → type accord
            const ys = [a.py, b.py, c.py].sort((y1, y2) => y1 - y2);
            const isUpward = ys[1] < (ys[0] + ys[2]) / 2;
            const type = isUpward ? 'min' : 'maj';

            // Couleur
            const baseColor = isUpward
                ? CONFIG.colors.triangleMinor
                : CONFIG.colors.triangleMajor;

            const col = g.color(baseColor);
            col.setAlpha(isActive ? 200 : 80);

            g.noStroke();
            g.fill(col);
            g.triangle(a.px, a.py, b.px, b.py, c.px, c.py);

            // Positionnement du label (milieu de la base)
            const leftmost = [a, b, c].reduce((min, n) => (n.px < min.px ? n : min));
            const others = [a, b, c].filter(n => n !== leftmost);
            const rightmost = others.reduce((max, n) => (n.px > max.px ? n : max));

            const baseX = (leftmost.px + rightmost.px) / 2;
            const baseY = (leftmost.py + rightmost.py) / 2;
            const verticalOffset = CONFIG.fontSize * (type === 'min' ? 0.5 : -0.4) * zoom;

            // Nom de fondamentale (priorité à la gamme si dispo)
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

            // Chiffre romain (si gamme fournie)
            let numeral = '';
            if (gamme) {
                const relChroma = mod12(leftmost.pc - gamme.tonicPc);
                const degreeLabel = gamme.getLabel(relChroma);
                numeral = getRomanNumeral(degreeLabel, type);
            }

            // Centre visuel du triangle (pour le chiffre romain)
            const cx = (a.px + b.px + c.px) / 3;
            const cy = (Math.min(a.py, b.py, c.py) + Math.max(a.py, b.py, c.py)) / 2;

            // Label
            if (labelText) {
                g.push();
                g.textAlign(CENTER, CENTER);
                g.textSize(CONFIG.fontSize * 0.75 * zoom);
                g.textFont(CONFIG.fontFamily);
                g.fill(CONFIG.colors.chordDisplay);
                g.text(labelText, baseX, baseY + verticalOffset);
                g.pop();
            }

            // Chiffre romain
            if (numeral) {
                g.push();
                g.textAlign(CENTER, CENTER);
                g.textSize(CONFIG.fontSize * 1.5 * zoom);
                g.textFont(CONFIG.fontFamilyRoman);
                g.textStyle(BOLD);
                g.fill(CONFIG.colors.bg);
                g.text(numeral, cx, cy);
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
                if (labelText) g.text(labelText, baseX, baseY + verticalOffset);
                g.pop();

                if (numeral) {
                    g.push();
                    g.textAlign(CENTER, CENTER);
                    g.textFont(CONFIG.fontFamilyRoman);
                    g.textSize(CONFIG.fontSize * 1.5 * zoom);
                    const romanColor = g.color(CONFIG.colors.nodeLabel);
                    romanColor.setAlpha(250);
                    g.fill(romanColor);
                    g.noStroke();
                    g.text(numeral, cx, cy);
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
