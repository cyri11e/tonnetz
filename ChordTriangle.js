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
                        const tri = ChordTriangle.buildTriangle(shared, other1, other2, this.gamme);
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

                    const tri = this.buildSpecialChord(...nodesOrdered, type);


                    //const tri = this.buildSpecialChord(other1, shared, other2, typeLabel === 'M3' ? 'aug' : 'dim');
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





    buildSpecialChord(a, b, c, type) {
        if (!a || !b || !c) return null;

        const nodes = [a, b, c];

        const center = {
            x: (a.px + b.px + c.px) / 3,
            y: (a.py + b.py + c.py) / 3
        };

        // Pour rester isomorphe aux triangles: base = extrémités
        const baseMidpoint = {
            x: (a.px + c.px) / 2,
            y: (a.py + c.py) / 2
        };

        // Racine géométrique : le nœud le plus à gauche
        let root = [a, b, c].reduce((best, n) => {
            if (n.px < best.px) return n;
            if (n.px === best.px) {
                if (type === 'dim' && n.py < best.py) return n; // plus haut
                if (type === 'aug' && n.py > best.py) return n; // plus bas
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
            isUpward: 'dim' ? false : true,     // triangle plat
            center,
            baseMidpoint,
            label,
            numeral
        };
    }

    drawSpecialChordLabel(g, tri, zoom) {
        const root = tri.nodes[0]; // déjà trié dans buildSpecialChord()
        const offsetX = CONFIG.fontSize * 0.6 * zoom;
        const offsetY = CONFIG.fontSize * 0.3 * zoom;

        g.push();
        g.textAlign(LEFT, CENTER);
        g.textFont(CONFIG.fontFamily);
        g.textSize(CONFIG.fontSize * zoom);
        g.fill(CONFIG.colors.chordDisplay);
        g.noStroke();

        g.text(tri.label, root.px + offsetX, root.py + offsetY);
        g.pop();
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

        // 🔸 Affichage des accords spéciaux (aug/dim)
        for (const tri of this.triangles) {
            if (tri.type !== 'aug' && tri.type !== 'dim') continue;

            const root = tri.nodes[0];
            const labelText = zoom < 0.7 ? '' :
                zoom < 1 ? tri.label.slice(0, 2) :
                    zoom < 1.2 ? tri.label :
                        `${tri.label}`;

            if (!labelText) continue;

            const offsetX = CONFIG.fontSize * 0.6 * zoom;
            const offsetY = CONFIG.fontSize * 0.3 * zoom;

            const labelColor = tri.type === 'dim'
                ? CONFIG.colors.triangleMinor
                : CONFIG.colors.triangleMajor;

            g.push();
            g.textAlign(LEFT, CENTER);
            g.textSize(CONFIG.fontSize * 0.75 * zoom);
            g.textFont(CONFIG.fontFamily);
            g.fill(labelColor);
            g.noStroke();
            g.text(labelText, root.px + offsetX, root.py + offsetY);
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
