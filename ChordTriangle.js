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
        this.buildSpecialFromEdges();   // triangles plats (aug/dim)
        this.filterByScale();
        console.log(`🔺 ChordTriangle: ${this.triangles.length}/${this.trianglesAll.length} triangles dans la gamme`);
    }

    buildTriangle(a, b, c) {
        const nodes = [a, b, c];

        // Détection du type (majeur ou mineur) via orientation verticale
        const ys = nodes.map(n => n.py).sort((y1, y2) => y1 - y2);
        const isUpward = ys[1] < (ys[0] + ys[2]) / 2;
        const type = isUpward ? 'min' : 'maj';

        // Détection de l’arête de base (la plus longue)
        const distances = [
            { idx: [0, 1], d: (a.px - b.px) ** 2 + (a.py - b.py) ** 2 },
            { idx: [1, 2], d: (b.px - c.px) ** 2 + (b.py - c.py) ** 2 },
            { idx: [2, 0], d: (c.px - a.px) ** 2 + (c.py - a.py) ** 2 }
        ];
        const base = distances.reduce((max, d) => d.d > max.d ? d : max);
        const baseIdx = base.idx;
        const n1 = nodes[baseIdx[0]];
        const n2 = nodes[baseIdx[1]];

        // Angle d’orientation du label
        const labelAngle = Math.atan2(n2.py - n1.py, n2.px - n1.px);

        // Nom de fondamentale (ancré sur le nœud le plus à gauche)
        const leftmost = nodes.reduce((min, n) => (n.px < min.px ? n : min));
        let displayName = leftmost.name;
        if (typeof this.gamme?.getNoteName === 'function') {
            displayName = this.gamme.getNoteName(leftmost.pc) ?? leftmost.name;
        }

        // Label texte
        const label = `${displayName} ${type === 'min' ? 'min' : 'MAJ'}`;

        // Chiffre romain
        let numeral = '';
        if (this.gamme) {
            const relChroma = mod12(leftmost.pc - this.gamme.tonicPc);
            const degreeLabel = this.gamme.getLabel(relChroma);
            numeral = getRomanNumeral(degreeLabel, type);
        }

        return {
            nodes,
            type,
            isUpward,
            baseIdx,
            labelAngle,
            label,
            numeral
        };
    }


    buildSpecialChord(a, b, c) {
        if (!a || !b || !c) return null;

        const nodes = [a, b, c];

        // recherche geometrique
        const isUpward = c.py - a.py < 0;
        const type = isUpward ? 'aug' : 'dim';



        // Convention : base = extrémités = [a, c]
        const baseIdx = type == 'aug' ? [0, 1] : [0, 2];
        const n1 = nodes[baseIdx[0]];
        const n2 = nodes[baseIdx[1]];

        const labelAngle = Math.atan2(n2.py - n1.py, n2.px - n1.px);


        // Racine géométrique : le nœud le plus à gauche
        let root = nodes.reduce((best, n) => {
            if (n.px < best.px) return n;
            if (n.px === best.px) {
                if (type === 'dim' && n.py < best.py) return n;
                if (type === 'aug' && n.py > best.py) return n;
            }
            return best;
        }, a);

        let displayName = root.name;
        if (typeof this.gamme?.getNoteName === 'function') {
            displayName = this.gamme.getNoteName(root.pc) ?? root.name;
        }

        const label = `${displayName} ${type}`;
        let numeral = '';
        if (this.gamme) {
            const relChroma = mod12(root.pc - this.gamme.tonicPc);
            const degreeLabel = this.gamme.getLabel(relChroma);
            numeral = getRomanNumeral(degreeLabel, type);
        }

        return {
            nodes,
            type,               // 'aug' | 'dim'
            isUpward: false,    // triangle plat
            baseIdx,
            labelAngle,
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
        // Réinitialise la collection complète de triangles
        this.trianglesAll = [];

        // Ensemble pour éviter les doublons (même triangle trouvé via des paires d’arêtes différentes)
        const seen = new Set();

        // Fonction utilitaire: identifiant stable d’un nœud basé sur ses coordonnées du Tonnetz
        const idOf = (n) => `${n.i},${n.j}`;


        // Clé canonique d’un triangle: les 3 ids triés, afin d’être indépendante de l’ordre a/b/c
        const keyOfTri = (a, b, c) => [idOf(a), idOf(b), idOf(c)].sort().join('|');

        // Parcours de TOUTES les paires d’arêtes (i < j pour ne pas dupliquer les paires)
        for (let i = 0; i < this.edges.length; i++) {
            for (let j = i + 1; j < this.edges.length; j++) {
                const e1 = this.edges[i];
                const e2 = this.edges[j];

                // 1) Détecter si e1 et e2 partagent un nœud (condition nécessaire pour former un triangle)
                const shared = [e1.a, e1.b].find(n => n === e2.a || n === e2.b);
                if (!shared) continue; // pas de nœud commun → impossible de fermer un triangle avec ces deux arêtes

                // 2) Récupérer les deux extrémités non partagées (les “pointes” du triangle potentiel)
                const other1 = e1.a === shared ? e1.b : e1.a;
                const other2 = e2.a === shared ? e2.b : e2.a;

                // 3) Vérifier l’existence d’une 3e arête reliant ces deux extrémités
                //    Si elle existe, on a bien un triangle fermé (3 arêtes, 3 sommets)
                const e3 = this.edges.find(e =>
                    (e.a === other1 && e.b === other2) || (e.a === other2 && e.b === other1)
                );

                if (e3) {
                    // 4) Dédoublonnage: même triangle possible via une autre paire (e1', e2')
                    const key = keyOfTri(shared, other1, other2);
                    if (!seen.has(key)) {
                        seen.add(key);

                        // 5) Construction d’un triangle enrichi (type, centre, label, etc.)
                        const tri = this.buildTriangle(shared, other1, other2);
                        this.trianglesAll.push(tri);
                    }
                }
            }
        }

        // 6) Filtrage final selon la gamme active (ne conserver que les triangles 100% dans la gamme)
        this.filterByScale();

        // 7) Journalisation: triangles retenus vs triangles détectés avant filtrage
        console.log(`🔺 buildFromEdges → ${this.triangles.length}/${this.trianglesAll.length} triangles dans la gamme`);
    }


    buildSpecialFromEdges() {
        const seen = new Set();
        const idOf = (n) => `${n.i},${n.j}`;
        const keyOfTri = (a, b, c) => [idOf(a), idOf(b), idOf(c)].sort().join('|');

        const detectFlatTriangles = (edges, typeLabel) => {
            console.log(`🔍 Scanning edges of type ${typeLabel} (${edges.length})`);

            for (let i = 0; i < edges.length; i++) {
                const e1 = edges[i];

                for (let j = i + 1; j < edges.length; j++) {
                    const e2 = edges[j];

                    // Cherche un nœud partagé
                    const shared = [e1.a, e1.b].find(n => n === e2.a || n === e2.b);
                    if (!shared) continue;

                    const other1 = e1.a === shared ? e1.b : e1.a;
                    const other2 = e2.a === shared ? e2.b : e2.a;

                    // Vérifie que les deux arêtes sont alignées
                    const v1 = { di: shared.i - other1.i, dj: shared.j - other1.j };
                    const v2 = { di: other2.i - shared.i, dj: other2.j - shared.j };
                    if (v1.di !== v2.di || v1.dj !== v2.dj) {
                        console.log(`✗ Non aligné: ${idOf(other1)} — ${idOf(shared)} — ${idOf(other2)}`);
                        continue;
                    }

                    const key = keyOfTri(shared, other1, other2);
                    if (seen.has(key)) continue;
                    seen.add(key);

                    const type = typeLabel === 'M3' ? 'aug' : 'dim';
                    const allNodes = [other1, shared, other2];

                    // Détermine la racine géométrique
                    const root = allNodes.reduce((best, n) => {
                        if (n.px < best.px) return n;
                        if (n.px === best.px) {
                            if (type === 'dim' && n.py < best.py) return n; // plus haut
                            if (type === 'aug' && n.py > best.py) return n; // plus bas
                        }
                        return best;
                    }, allNodes[0]);

                    // Réordonne les nœuds avec root en premier
                    const nodesOrdered = [root, ...allNodes.filter(n => n !== root)];

                    const tri = this.buildSpecialChord(...nodesOrdered);

                    if (tri) {
                        this.trianglesAll.push(tri);
                        //console.log(`✓ Triangle plat détecté: ${tri.label} [${idOf(other1)} - ${idOf(shared)} - ${idOf(other2)}]`);
                    }
                }
            }
        };

        // Filtrage des arêtes par type
        const edgesM3 = this.edges.filter(e => e.interval === 'M3');
        const edgesm3 = this.edges.filter(e => e.interval === 'm3');

        detectFlatTriangles(edgesM3, 'M3');
        detectFlatTriangles(edgesm3, 'm3');

        console.log(`▶ buildSpecialFromEdges terminé. Total triangles plats: ${this.trianglesAll.length}`);
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
            if (tri.type !== 'min' && tri.type !== 'maj') continue;

            const [a, b, c] = tri.nodes;

            const isActive =
                !!activePcs &&
                activePcs.has(a.pc) &&
                activePcs.has(b.pc) &&
                activePcs.has(c.pc);

            // Couleur de fond du triangle
            const baseColor = tri.type === 'min'
                ? CONFIG.colors.triangleMinor
                : CONFIG.colors.triangleMajor;

            const col = g.color(baseColor);
            col.setAlpha(isActive ? 200 : 80);

            g.noStroke();
            g.fill(col);
            g.triangle(a.px, a.py, b.px, b.py, c.px, c.py);

            // Recalcule la géométrie depuis les px/py ACTUELS
            const centerX = (a.px + b.px + c.px) / 3;
            const centerY = (a.py + b.py + c.py) / 3;

            let baseMidX, baseMidY;
            if (tri.baseIdx && tri.baseIdx.length === 2) {
                // Si l’info sur la base existe, on s’y fie
                const n1 = tri.nodes[tri.baseIdx[0]];
                const n2 = tri.nodes[tri.baseIdx[1]];
                baseMidX = (n1.px + n2.px) / 2;
                baseMidY = (n1.py + n2.py) / 2;
            } else {
                // Sinon, on prend l’arête la plus longue comme base
                const dAB = (a.px - b.px) ** 2 + (a.py - b.py) ** 2;
                const dBC = (b.px - c.px) ** 2 + (b.py - c.py) ** 2;
                const dCA = (c.px - a.px) ** 2 + (c.py - a.py) ** 2;

                if (dAB >= dBC && dAB >= dCA) {
                    baseMidX = (a.px + b.px) / 2; baseMidY = (a.py + b.py) / 2;
                } else if (dBC >= dAB && dBC >= dCA) {
                    baseMidX = (b.px + c.px) / 2; baseMidY = (b.py + c.py) / 2;
                } else {
                    baseMidX = (c.px + a.px) / 2; baseMidY = (c.py + a.py) / 2;
                }
            }

            // Label texte (nom d’accord)
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
                g.text(labelText, baseMidX, baseMidY + verticalOffset);
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
                g.text(tri.numeral, centerX, centerY);
                g.pop();
            }

            // Réaccentuation si actif
            if (isActive) {
                if (labelText) {
                    g.push();
                    g.textAlign(CENTER, CENTER);
                    g.textFont(CONFIG.fontFamily);
                    g.textSize(CONFIG.fontSize * 0.75 * zoom);
                    const labelColor = g.color(CONFIG.colors.nodeLabel);
                    labelColor.setAlpha(250);
                    g.fill(labelColor);
                    g.noStroke();
                    g.text(labelText, baseMidX, baseMidY + verticalOffset);
                    g.pop();
                }

                if (tri.numeral) {
                    g.push();
                    g.textAlign(CENTER, CENTER);
                    g.textFont(CONFIG.fontFamilyRoman);
                    g.textSize(CONFIG.fontSize * 1.5 * zoom);
                    const romanColor = g.color(CONFIG.colors.nodeLabel);
                    romanColor.setAlpha(250);
                    g.fill(romanColor);
                    g.noStroke();
                    g.text(tri.numeral, centerX, centerY);
                    g.pop();
                }
            }
        }

        // 🔸 Accords spéciaux (aug/dim) — déjà OK, on garde l’ancrage sur root.px/root.py
        for (const tri of this.triangles) {
            if (tri.type !== 'aug' && tri.type !== 'dim') continue;

            const labelText = zoom < 0.7 ? '' :
                zoom < 1 ? tri.label.slice(0, 2) :
                    zoom < 1.2 ? tri.label :
                        `${tri.label}`;

            if (!labelText) continue;

            const isActive =
                !!activePcs &&
                tri.nodes.every(n => activePcs.has(n.pc));

            const labelColor = isActive
                ? (tri.type === 'dim'
                    ? CONFIG.colors.triangleMinor
                    : CONFIG.colors.triangleMajor)
                : CONFIG.colors.chordDisplay; // couleur neutre comme les accords non actifs


            // Milieu de l’arête (baseIdx est [0,2] pour les triangles plats)
            const n1 = tri.nodes[tri.baseIdx[0]];
            const n2 = tri.nodes[tri.baseIdx[1]];
            const n3 = tri.nodes[tri.baseIdx[2]];
            const midX = (n1.px + n2.px) / 2;
            const midY = (n1.py + n2.py) / 2;

            g.push();
            g.translate(midX, midY);
            g.rotate(tri.labelAngle); // ← rotation selon orientation de la diagonale
            g.textAlign(CENTER, CENTER);
            g.textSize(CONFIG.fontSize * 0.75 * zoom);
            g.textFont(CONFIG.fontFamily);
            g.fill(labelColor);
            g.noStroke();
            g.text(labelText, 0, 0);
            g.pop();
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
