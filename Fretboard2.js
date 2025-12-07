class Fretboard {
  constructor({
    frets = 20,
    canvasWidth = 800,
    canvasHeight = null,
    openStrings = [40, 45, 50, 55, 59, 64], // E2 A2 D3 G3 B3 E4
    maxSpan = 5,
    alwaysAllowOpen = true,
    showImpossibleNotes = true
  }) {
    this.frets = frets;
    this.openStrings = openStrings;
    this.stringCount = openStrings.length;
    this.tuning = openStrings.map(m => ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][m % 12]);
    this.maxSpan = maxSpan;
    this.alwaysAllowOpen = alwaysAllowOpen;
    this.showImpossibleNotes = showImpossibleNotes;

    this.rootPc = null;
    this.hide = false;
    this.playZone = null;

    this.activeNotes = new Set();
    this.impossibleNotes = new Set();
    this.activeRange = [0, frets];

    this.selectionStartX = null;
    this.selectionEndX = null;
    this.isSelecting = false;
this.comboIndex = 0;

    // Temporisation (non utilisée ici, gardée telle quelle)
    this.pendingMidi = [];
    this.stabilizeTimer = null;
    this.stabilizeDelay = 100;

    this.resizeTo(canvasWidth, canvasHeight || Math.round(canvasWidth * 0.2));
  }

  resizeTo(w, h) {
    this.canvasW = w;
    this.canvasH = h;
    this.margin = w * 0.05;
    this.unit = h / (this.stringCount + 2);

    const usableW = w - 2 * this.margin;
    const usableH = h - 2 * this.margin;

    // Positions de frettes (rapport réaliste)
    const ratios = [];
    for (let i = 0; i <= this.frets; i++) {
      ratios.push(1 - Math.pow(2, -i / 12));
    }
    const maxR = ratios[this.frets] || 1;
    this.fretPositions = ratios.map(r => this.margin + (r / maxR) * usableW);

    const denom = Math.max(this.stringCount - 1, 1);
    this.stringY = [];
    this.stringThickness = [];
    for (let i = 0; i < this.stringCount; i++) {
      const ratio = 1 - i / denom;
      this.stringY.push(this.margin + ratio * usableH);
      this.stringThickness.push(this.unit * 0.2 + ((denom - i) / denom) * this.unit * 0.3);
    }
  }

  // Centre de case robuste (case 0 = entre sillet et frette 1)
  getCaseCenterX(caseIndex) {
    if (caseIndex === 0) {
      const nutX = this.fretPositions[0] - this.unit * 0.5;
      const x1 = this.fretPositions[0];
      return (nutX + x1) / 2;
    }
    const x0 = this.fretPositions[caseIndex - 1];
    const x1 = this.fretPositions[caseIndex];
    return (x0 != null && x1 != null) ? (x0 + x1) / 2 : null;
  }

  setRootPc(rootPc) {
    this.rootPc = ((rootPc % 12) + 12) % 12;
  }

  setPlayZone(zone) {
    this.playZone = zone;
    this.updateFilteredCombo();
  }

  // Version stable (debug console) — pas de filtres hors manche
  setMidiNotes(midiNums = []) {
    const result = findOptimalFingering(
      midiNums,
      this.openStrings,
      this.frets,
      this.alwaysAllowOpen
    );

    this.activeNotes = new Set();
    this.impossibleNotes = new Set();

    let fretMin = Infinity;
    let fretMax = -Infinity;

    for (const p of result.fingering) {
      const id = `${p.string}-${p.fret}-${p.midi % 12}`;
      this.activeNotes.add(id);

      if (p.fret !== 0 || !this.alwaysAllowOpen) {
        fretMin = Math.min(fretMin, p.fret);
        fretMax = Math.max(fretMax, p.fret);
      }
    }

    for (const midi of result.impossibleNotes) {
      console.log('🎵 Note hors manche:', midi);
      this.impossibleNotes.add(midi);
    }

    if (!isFinite(fretMin)) {
      fretMin = 0;
      fretMax = 0;
    }
    this.outOfRangeLowCount = result.outOfRangeLowCount || 0;
    this.outOfRangeHighCount = result.outOfRangeHighCount || 0;

    this.activeRange = [fretMin, fretMax];

    this.bestCombo = result.fingering;
this.allCombos = (result.allValidCombos || [result.fingering])
  .map(combo => {
    const fretsUsed = combo.map(p => p.fret).filter(f => f > 0);
    const minFret = fretsUsed.length ? Math.min(...fretsUsed) : 0;
    const maxFret = fretsUsed.length ? Math.max(...fretsUsed) : 0;
    const range = fretsUsed.length ? maxFret - minFret + 1 : 0;
    const score = combo.reduce((sum, p) => sum + p.fret + p.string, 0);
    return { combo, range, score };
  })
  .sort((a, b) => {
    if (a.range !== b.range) return a.range - b.range;
    return a.score - b.score;
  })
  .map(c => c.combo); // on ne garde que les combos triés


    
        this.updateFilteredCombo();
 console.log('🎯 Combinaisons valides triées par range puis sc ore:');

[...this.allCombos]
  .map(combo => {
    const fretsUsed = combo.map(p => p.fret).filter(f => f > 0);
    const minFret = fretsUsed.length ? Math.min(...fretsUsed) : 0;
    const maxFret = fretsUsed.length ? Math.max(...fretsUsed) : 0;
    const range = fretsUsed.length ? maxFret - minFret + 1 : 0;
    const score = combo.reduce((sum, p) => sum + p.fret + p.string, 0);
    return { combo, fretsUsed, range, score };
  })
  .sort((a, b) => {
    if (a.range !== b.range) return a.range - b.range;
    return a.score - b.score;
  })
  .forEach(({ combo, fretsUsed, range, score }, index) => {
    console.log(`Combo ${index + 1}:`);
    console.log(`  ↳ Notes:`, combo.map(p => `S${p.string} F${p.fret} M${p.midi}`));
    console.log(`  ↳ Frets used: [${fretsUsed.join(', ')}]`);
    console.log(`  ↳ Range: ${range}`);
    console.log(`  ↳ Score: ${score}`);
  });

    



  }

getCurrentCombo() {
  if (!this.allCombos?.length) return [];
  const idx = Number.isInteger(this.comboIndex) ? this.comboIndex : 0;
  if (idx < 0 || idx >= this.allCombos.length) return [];
  return this.allCombos[idx];
}


drawNote(g, cx, cy, midi, playedCount) {
  const r = this.unit * 0.8;

  // Vérifie si la note appartient à l’accord courant
  let func = null;
  if (playedCount >= 3 && this.currentChord?.notes) {
    const match = this.currentChord.notes.find(n => n.midi % 12 === midi % 12);
    if (match) func = match.func;
  }

  // Couleur spéciale pour la fondamentale
  const isRoot = func === "R";
  const fillColor = isRoot ? '#ff0000' : '#ffcc00';

  // Dessin de la pastille
  g.stroke(fillColor);
  g.fill(fillColor);
  g.circle(cx, cy, r);

  // Nom de la note au centre
  g.fill('#000');
  g.noStroke();
  g.textAlign(g.CENTER, g.CENTER);
  g.textSize(this.unit * 0.7);
  g.text(midiToNoteName(midi), cx, cy);

  // Fonction harmonique à droite (seulement si accord complet)
  if (func) {
    g.fill('#fff');
    g.stroke('#000');
    g.strokeWeight(2)
    g.textAlign(g.LEFT, g.CENTER);
    g.textSize(this.unit * 0.6);
    g.text(func, cx + r * 0.8, cy);
  }
}




  setChord(chordStruct) {
    // On ne touche pas à activeKeys ni à setMidiNotes !
    // On garde juste une référence externe
    this.currentChord = chordStruct;

    // Optionnel : extraire directement les infos utiles
    this.chordLabel = chordStruct.label;
    this.chordNotes = chordStruct.notes; // [{midi, note, func}, ...]
  }

clearNotes() {
  this.activeNotes = new Set();
  this.impossibleNotes = new Set();
  this.allCombos = [];
  this.filteredCombo = [];
  this.bestCombo = [];
  this.outOfRangeLowCount = 0;
  this.outOfRangeHighCount = 0;
  this.comboIndex = 0;
  this.activeRange = [0, 0];
}


  
 updateFilteredCombo() {
  if (!this.allCombos?.length) {
    this.filteredCombo = [];
    this.activeNotes = new Set();
    return;
  }

  // 1) Choisir UNE combinaison entière selon la zone
  let chosen = null;

  if (this.playZone?.type === 'center') {
    const target = this.playZone.centerFret;
    let best = null;
    let bestDist = Infinity;

    for (const combo of this.allCombos) {
      const frets = combo.map(p => p.fret).filter(f => f > 0);
      if (!frets.length) continue;
      const avg = frets.reduce((a, b) => a + b, 0) / frets.length;
      const dist = Math.abs(avg - target);
      if (dist < bestDist) {
        bestDist = dist;
        best = combo;
      }
    }
    chosen = best || [];
  } else if (this.playZone?.type === 'range') {
    const { minFret, maxFret } = this.playZone;
    // Minimiser le nombre de notes hors zone
    let best = null;
    let bestPenalty = Infinity;

    for (const combo of this.allCombos) {
      const penalty = combo.reduce((acc, p) => acc + ((p.fret < minFret || p.fret > maxFret) ? 1 : 0), 0);
      if (penalty < bestPenalty) {
        bestPenalty = penalty;
        best = combo;
      }
    }
    chosen = best || [];
  } else {
    chosen = this.bestCombo || [];
  }

  this.filteredCombo = chosen;

  // 2) Mettre à jour activeNotes A PARTIR DE LA COMBINAISON CHOISIE
  // => C’est elle qui “fait foi” pour l’affichage (cordes actives, X vs lettre, etc.)
  this.activeNotes = new Set();
  for (const p of this.filteredCombo) {
    const id = `${p.string}-${p.fret}-${p.midi % 12}`;
    this.activeNotes.add(id);
  }
}



  selectComboForZone(zone) {
    this.playZone = zone;
    this.filteredCombo = null;

    if (!this.allCombos?.length) return;

    if (zone.type === 'center') {
      const target = zone.centerFret;
      let best = null;
      let bestDist = Infinity;

      for (const combo of this.allCombos) {
        const frets = combo.map(p => p.fret).filter(f => f > 0);
        if (!frets.length) continue;
        const avg = frets.reduce((a, b) => a + b, 0) / frets.length;
        const dist = Math.abs(avg - target);
        if (dist < bestDist) {
          bestDist = dist;
          best = combo;
        }
      }

      this.filteredCombo = best || null;
    }

    if (zone.type === 'range') {
      const { minFret, maxFret } = zone;
      const valid = this.allCombos.find(combo =>
        combo.every(p => p.fret >= minFret && p.fret <= maxFret)
      );
      this.filteredCombo = valid || null;
    }
  }

draw(g, rootPc = null) {
  if (this.hide) return;

  g.push();
  g.translate(0, g.height - this.canvasH);

  const nutX = this.fretPositions[0];
  const lastFretX = this.fretPositions[this.frets];
  const centerY = this.margin + (this.canvasH - 2 * this.margin) / 2;
  const [minFret, maxFret] = this.activeRange;

  // 🎸 Fond
  g.noStroke();
  g.fill('#222');
  g.rect(0, 0, this.canvasW, this.canvasH);

  // 🎸 Sillet
  g.stroke('#fff');
  g.strokeWeight(this.unit * 0.15);
  g.line(nutX, this.margin, nutX, this.canvasH - this.margin);

  // 🎸 Frettes
  g.strokeWeight(this.unit * 0.08);
  for (let i = 1; i <= this.frets; i++) {
    g.line(this.fretPositions[i], this.margin, this.fretPositions[i], this.canvasH - this.margin);
  }

  // 🎸 Zones hors plage
  g.noStroke();
  g.fill(0, 0, 0, 120);
  for (let k = 0; k <= this.frets; k++) {
    if (k < minFret || k > maxFret) {
      const x0 = this.fretPositions[k - 1] || nutX;
      const x1 = this.fretPositions[k];
      if (x0 != null && x1 != null) {
        g.rect(x0, this.margin, x1 - x0, this.canvasH - 2 * this.margin);
      }
    }
  }

  // 🎸 Cordes
  for (let i = 0; i < this.stringCount; i++) {
    const y = this.stringY[i];
    const isPlayed = [...this.activeNotes].some(id => id.startsWith(`${i}-`));
    g.stroke(isPlayed ? '#ffcc00' : 'rgba(180,180,180,0.5)');
    g.strokeWeight(this.unit * 0.06 + (this.stringCount - 1 - i) * this.unit * 0.02);
    g.line(nutX, y, lastFretX, y);
  }

// 🎵 Noms des cordes
g.noStroke();
g.textSize(this.unit * 0.8);
g.textAlign(g.CENTER, g.CENTER);

const isIdle = !(this.allCombos && this.allCombos.length > 0);

for (let i = 0; i < this.stringCount; i++) {
  const y = this.stringY[i];
  const xTxt = nutX - this.unit * 0.8;
  const isPlayed = [...this.activeNotes].some(id => id.startsWith(`${i}-`));

  // If idle, show tuning; otherwise show tuning only when the string is played, X if muted/inactive
  const label = isIdle ? this.tuning[i] : (isPlayed ? this.tuning[i] : 'X');
  g.fill(isPlayed ? '#fc0' : '#fff');
  g.text(label, xTxt, y);
}


  // 🎯 Repères visuels
  g.fill('#9E9E9E');
  g.noStroke();
  [3,5,7,9,12,15,17,19].forEach(k => {
    if (k > this.frets) return;
    const cx = this.getCaseCenterX(k);
    if (cx != null) {
      if (k === 12) {
        g.circle(cx, centerY - this.unit * 0.7, this.unit * 0.4);
        g.circle(cx, centerY + this.unit * 0.7, this.unit * 0.4);
      } else {
        g.circle(cx, centerY, this.unit * 0.4);
      }
    }
  });

  // 🔢 Numéros de frettes
  g.textSize(this.unit * 0.5);
  g.textAlign(g.CENTER, g.TOP);
  g.fill('#fff');
  [3,5,7,9,12,15,17,19].forEach(k => {
    const cx = this.getCaseCenterX(k);
    if (cx != null) g.text(k, cx, this.canvasH - this.margin + this.unit * 0.2);
  });

  // 🎶 Notes du combo courant
  const combo = this.getCurrentCombo();
  const playedCount = combo.length;
  for (const p of combo) {
    const y = this.stringY[p.string];
    const cx = p.fret === 0
      ? this.fretPositions[0] - this.unit * 0.8
      : this.getCaseCenterX(p.fret);
    if (cx == null) continue;
    this.drawNote(g, cx, y, p.midi,playedCount);
  }

  // 🔴 Indicateurs hors manche
  if (this.outOfRangeLowCount > 0) {
    const y = this.stringY[0];
    const x = this.fretPositions[0] - this.unit * 1.5;
    g.fill('#b31010');
    g.circle(x, y, this.unit);
    g.fill(255);
    g.textAlign(g.CENTER, g.CENTER);
    g.textSize(this.unit * 0.8);
    g.text(this.outOfRangeLowCount, x, y);
  }
  if (this.outOfRangeHighCount > 0) {
    const y = this.stringY.at(-1);
    const x = lastFretX + this.unit;
    g.fill('#b31010');
    g.circle(x, y, this.unit);
    g.fill(255);
    g.textAlign(g.CENTER, g.CENTER);
    g.textSize(this.unit * 0.8);
    g.text(this.outOfRangeHighCount, x, y);
  }

  g.pop();
}


updateFilteredCombo() {
  const combo = this.allCombos[this.comboIndex] || [];

  this.activeNotes = new Set();
  let fretMin = Infinity;
  let fretMax = -Infinity;

  for (const p of combo) {
    const id = `${p.string}-${p.fret}-${p.midi % 12}`;
    this.activeNotes.add(id);

    if (p.fret !== 0 || !this.alwaysAllowOpen) {
      fretMin = Math.min(fretMin, p.fret);
      fretMax = Math.max(fretMax, p.fret);
    }
  }

  if (!isFinite(fretMin)) {
    fretMin = 0;
    fretMax = 0;
  }

  this.activeRange = [fretMin, fretMax];
}

getClosestComboTo(x, y) {
  let bestIndex = 0;
  let bestDist = Infinity;

  for (let i = 0; i < this.allCombos.length; i++) {
    const combo = this.allCombos[i];
    let distSum = 0;

    for (const p of combo) {
      const cx = p.fret === 0
        ? this.fretPositions[0] - this.unit * 0.8
        : this.getCaseCenterX(p.fret);
      const cy = this.stringY[p.string];
      distSum += Math.hypot(cx - x, cy - y);
    }

    if (distSum < bestDist) {
      bestDist = distSum;
      bestIndex = i;
    }
  }

  return bestIndex;
}
// Dans ta classe:
handleHover(g) {
  if (this.hide) return;
  if (!g) return;

  // Anti-flash (optionnel)
  const now = (typeof g.millis === 'function') ? g.millis() : performance.now();
  if (this.lastHoverTime && (now - this.lastHoverTime) < 80) return;
  this.lastHoverTime = now;

  // Coordonnées souris
  const mx = g.mouseX;
  const my = g.mouseY;

  // Convertir en repère local du manche (tu fais translate(0, g.height - this.canvasH) dans draw)
  const localY = my - (g.height - this.canvasH);
  const localX = mx; // pas de translate en X dans ton draw

  // Garde-fous: uniquement si la souris est au-dessus du manche
  if (localY < 0 || localY > this.canvasH || localX < 0 || localX > this.canvasW) return;

  // Trouver le combo le plus proche du pointeur
  const newIndex = this.getClosestComboTo(localX, localY);
  if (Number.isInteger(newIndex) && newIndex !== this.comboIndex) {
    this.comboIndex = newIndex;
    this.updateFilteredCombo(); // recalcule activeNotes, activeRange, etc.
  }
}


}

function hexAlpha(a) {
  return Math.max(0, Math.min(255, a)).toString(16).padStart(2, '0');
}

/* ===== Helper: moteur de combinaisons (retourne toutes les combinaisons + meilleure) ===== */
function findOptimalFingering(midiNotes, openStrings, frets, alwaysAllowOpen = false) {
  const minPlayable = Math.min(...openStrings);
  const maxPlayable = Math.max(...openStrings.map(o => o + frets));

  const playableNotes = midiNotes.filter(m => m >= minPlayable && m <= maxPlayable);
  const outOfRangeNotes = midiNotes.filter(m => m < minPlayable || m > maxPlayable);
  const tooLowNotes = outOfRangeNotes.filter(m => m < minPlayable);
  const tooHighNotes = outOfRangeNotes.filter(m => m > maxPlayable);

  // Pour chaque note jouable, lister toutes les positions corde/frette possibles
  const noteOptions = playableNotes.map(midi => {
    const options = [];
    openStrings.forEach((open, string) => {
      const fret = midi - open;
      if (fret >= 0 && fret <= frets) {
        options.push({ midi, string, fret });
      }
    });
    return options;
  });

  // Mode automatique: si plus de notes que de cordes, on autorise plusieurs notes sur une même corde
  const allowMultipleNotesPerString = playableNotes.length > openStrings.length;

  function generateCombinations(optionsList, usedStrings = new Set(), index = 0, current = [], all = []) {
    if (index >= optionsList.length) {
      all.push(current.slice());
      return;
    }
    const opts = optionsList[index];
    for (const opt of opts) {
      if (allowMultipleNotesPerString || !usedStrings.has(opt.string)) {
        usedStrings.add(opt.string);
        current.push(opt);
        generateCombinations(optionsList, usedStrings, index + 1, current, all);
        current.pop();
        usedStrings.delete(opt.string);
      }
    }
    return all;
  }

// Génération brute
const allCombinations = [];
generateCombinations(noteOptions, new Set(), 0, [], allCombinations);

// Filtrage par range ≤ 5
const filteredCombos = allCombinations.filter(combo => {
  const fretsUsed = combo.map(p => p.fret).filter(f => f > 0);
  if (!fretsUsed.length) return true; // tout open = ok
  const minFret = Math.min(...fretsUsed);
  const maxFret = Math.max(...fretsUsed);
  const range = maxFret - minFret + 1;
  return range <= 6;
});


  // Scoring et range pour choisir la meilleure (mais on renvoie aussi tout)
  let best = null;
  let bestRange = Infinity;
  let bestScore = Infinity;

  for (const combo of allCombinations) {
    const fretsUsed = combo
      .map(p => p.fret)
      .filter(f => alwaysAllowOpen || f > 0);
    const minFret = fretsUsed.length ? Math.min(...fretsUsed) : 0;
    const maxFret = fretsUsed.length ? Math.max(...fretsUsed) : 0;
    const range = fretsUsed.length ? (maxFret - minFret + 1) : 0;

    // Score léger: somme frettes + indice de corde (favorise combos bas et compacts)
    const score = combo.reduce((s, p) => s + p.fret + p.string, 0);

    if (
      range < bestRange ||
      (range === bestRange && score < bestScore)
    ) {
      best = combo;
      bestRange = range;
      bestScore = score;
    }
  }

  return {
    fingering: best || [],
    allValidCombos: filteredCombos,

    impossibleNotes: outOfRangeNotes,
    outOfRangeLowCount: tooLowNotes.length,
    outOfRangeHighCount: tooHighNotes.length
  };
}
function midiToNoteName(midi, style = 'sharp') {
  const sharpNames = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const flatNames  = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

  const pc = midi % 12;

  if (style === 'sharp') return sharpNames[pc];
  if (style === 'flat')  return flatNames[pc];

  // mixed: tout en bémol sauf F♯ (pc = 6)
  if (style === 'mixed') {
    return pc === 6 ? sharpNames[pc] : flatNames[pc];
  }

  // fallback
  return sharpNames[pc];
}
function getIntervalName(midi1, midi2) {
  const semitones = Math.abs(midi2 - midi1) % 12;
  const names = ['P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'TT', 'P5', 'm6', 'M6', 'm7', 'M7'];
  return names[semitones];
}
// Même logique de centre que tes pastilles (alignement parfait)
function getNoteCenterXFor(p, fretPositions, unit, getCaseCenterX) {
  return p.fret === 0
    ? fretPositions[0] - unit * 0.8
    : getCaseCenterX(p.fret);
}
