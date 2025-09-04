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
        this.lastActiveTime = 0;
    }

    // Méthode principale appelée partout
    build() {
        this.buildFromEdges(); // construit les triangles min maj
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
        const label = `${displayName}${type === 'min' ? 'm' : ''}`;

        // Chiffre romain
        let numeral = '';
        if (this.gamme) {
            const relChroma = mod12(leftmost.pc - this.gamme.tonicPc);
            let degreeLabel = this.gamme.getDegreeLabel(relChroma)   ;
            // Fallback si hors gamme
            if (degreeLabel=='♪') {
                degreeLabel = pcToName(leftmost.pc); // ex: "F♯"
            }
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

        const label = `${displayName}${type}`;
        let numeral = '';
        if (this.gamme) {
            const relChroma = mod12(root.pc - this.gamme.tonicPc);
            const degreeLabel = this.gamme.getDegreeLabel(relChroma);
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
    draw(g, zoom, activePcs) {
        g.push();

        for (const tri of this.trianglesAll) {
            const [a, b, c] = tri.nodes;
            const isActive = !!activePcs && tri.nodes.every(n => activePcs.has(n.pc));
            const isInScale = this.gamme.pitchClasses.includes(a.pc) &&
                      this.gamme.pitchClasses.includes(b.pc) &&
                      this.gamme.pitchClasses.includes(c.pc);
            if (isActive) tri.lastActiveTime = millis(); // mise à jour du temps
                if (!isInScale && !isActive) continue;
            const fadeFactor = getFadeFactor(tri.lastActiveTime); // valeur entre 0 et 1
            
            // Détermine la couleur de fond
            let baseColor;
            switch (tri.type) {
                case 'min': baseColor = CONFIG.colors.triangleMinor; break;
                case 'maj': baseColor = CONFIG.colors.triangleMajor; break;
                case 'dim': baseColor = CONFIG.colors.triangleMinor; break;
                case 'aug': baseColor = CONFIG.colors.triangleMajor; break;
                default: baseColor = CONFIG.colors.chordDisplay; break;
            }


            const col = g.color(baseColor);
            col.setAlpha(fadeFactor > 0 ? 200 * fadeFactor : 60);
            g.noStroke();
            g.fill(col);

            // Dessin du triangle (seulement pour maj/min)
            if (tri.type === 'min' || tri.type === 'maj') {
                g.triangle(a.px, a.py, b.px, b.py, c.px, c.py);
            }

            // Calculs géométriques
            const centerX = (a.px + b.px + c.px) / 3;
            let centerY = (a.py + b.py + c.py) / 3;
            if (tri.type === 'min') centerY += CONFIG.fontSize * 0.4 * zoom;

            const n1 = tri.nodes[tri.baseIdx[0]];
            const n2 = tri.nodes[tri.baseIdx[1]];
            const baseMidX = (n1.px + n2.px) / 2;
            const baseMidY = (n1.py + n2.py) / 2;

            // Label text
            let labelText = zoom < 0.7 ? '' :
                zoom < 1 ? tri.label.slice(0, 2) :
                    zoom < 1.2 ? tri.label : tri.label;

            // Ajout du chiffre romain à la volée pour dim/aug
            if ((tri.type === 'dim' || tri.type === 'aug') && tri.numeral) {
                labelText += ` ${tri.numeral}`;

            }


if (labelText) {
  const labelColor = g.color(
    fadeFactor > 0
      ? CONFIG.colors.nodeLabel
      : CONFIG.colors.chordDisplay
  );

  labelColor.setAlpha(fadeFactor > 0 ? 255 * fadeFactor : 100);
  g.fill(labelColor);
  g.textFont(CONFIG.fontFamily);
  g.textAlign(CENTER, CENTER);
  g.textSize(tri.type === 'dim' || tri.type === 'aug'
    ? CONFIG.fontSize * 0.6 * zoom
    : CONFIG.fontSize * 0.75 * zoom);

  if (tri.type === 'aug' || tri.type === 'dim') {
    g.push();
    g.translate(baseMidX, baseMidY);
    g.rotate(tri.labelAngle);
    g.text(labelText, 0, 0);
    g.pop();
  } else {
    const verticalOffset = CONFIG.fontSize * (tri.type === 'min' ? 0.5 : -0.4) * zoom;
    g.text(labelText, baseMidX, baseMidY + verticalOffset);
  }
}


            // Chiffre romain
if (tri.numeral && (tri.type === 'min' || tri.type === 'maj')) {
  const romanColor = g.color(
    fadeFactor > 0
      ? CONFIG.colors.nodeLabel
      : CONFIG.colors.bg
  );
  romanColor.setAlpha(fadeFactor > 0 ? 255 * fadeFactor : 255);
  g.fill(romanColor);
  g.textFont(CONFIG.fontFamilyRoman);
  g.textStyle(BOLD);
  g.textAlign(CENTER, CENTER);
  g.textSize(CONFIG.fontSize * 1.5 * zoom);
  g.text(tri.numeral, centerX, centerY);
}

        }

        g.pop();
    }


    isActive(tri, activePcs) {
        const [a, b, c] = tri;
        return activePcs.has(a.pc) &&
            activePcs.has(b.pc) &&
            activePcs.has(c.pc);
    }
contains(tri, mx, my) {
  const [a, b, c] = tri.nodes;
  return pointInTriangleInner(mx, my, a.px, a.py, b.px, b.py, c.px, c.py, 0.85);
}

handleHover(mx, my) {
  for (const tri of this.trianglesAll) {
    if (this.contains(tri, mx, my)) {
      console.log("Hovered:", tri.label);
    }
  }
}
handlePress(mx, my) {
  for (const tri of this.trianglesAll) {
    if (this.contains(tri, mx, my)) {
      console.log("Pressed:", tri.label);

      // Active visuellement
      for (const node of tri.nodes) {
        tonnetz.activePcs.add(node.pc);
        node.manualSelected = true;
        node.lastActiveTime = millis();

        // Envoi MIDI réel
        midiInput.sendNoteOnPc(node.pc);
        // Simulation entrée interne
        midiInput.simulateNoteOnPc(node.pc);
      }

      this.currentPressedTriangle = tri;
      return true;
    }
  }
  return false;
}

handleRelease() {
  if (this.currentPressedTriangle) {
    for (const node of this.currentPressedTriangle.nodes) {
      tonnetz.activePcs.delete(node.pc);
      node.manualSelected = false;

      // Envoi MIDI réel
      midiInput.sendNoteOffPc(node.pc);
      // Simulation entrée interne
      midiInput.simulateNoteOffPc(node.pc);
    }
    this.currentPressedTriangle = null;
  }
}






}
