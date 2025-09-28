class ChordDetector {
  constructor() {
    this.noteNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    this.noteToPc = {
      'C':0, 'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,
      'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,
      'Ab':8,'A':9,'A#':10,'Bb':10,'B':11
    };

    this._lastMidiKey = '';
    this._lastResults = [];
  }

  // --- API principale ---
  detect(activeNotesNames, midiNumbers = null) {
    const midiNums = Array.isArray(midiNumbers) ? midiNumbers : [];
    const key = midiNums.slice().sort((a, b) => a - b).join(',');

    if (key === this._lastMidiKey) {
      return this._lastResults;
    }

    const chords = this.recognizeChord(midiNums);

    // Debug score
    this.debugScores(midiNums, chords);

    this._lastMidiKey = key;
    this._lastResults = chords;
    return chords;
  }

  // --- Reconnaissance par analyse d’intervalles ---
  recognizeChord(midiNums) {
    if (!midiNums || midiNums.length === 0) return [];

    const pcs = this.getUniquePcs(midiNums);
    const results = [];

    for (const rootPc of pcs) {
      const structure = this.analyzeIntervals(midiNums, rootPc);
      if (!structure) continue;

      const label = this.formatChordName(structure);
      results.push({
        ...structure,
        label
      });
    }

    let unique = this.deduplicate(results);
    return this.sortByPriority(unique, midiNums);
  }

analyzeIntervals(midiNums, rootPc) {
  const degrees = new Set();
  for (const n of midiNums) {
    const iv = ((n - rootPc) % 12 + 12) % 12;
    switch (iv) {
      case 1: degrees.add('b9'); break;
      case 2: degrees.add('9'); break;
      case 3: degrees.add('m3'); break;
      case 4: degrees.add('M3'); break;
      case 5: degrees.add('11'); break;
      case 6: degrees.add('b5'); break;
      case 7: degrees.add('P5'); break;
      case 8: degrees.add('#5'); break;
      case 9: degrees.add('13'); break;
      case 10: degrees.add('m7'); break;
      case 11: degrees.add('M7'); break;
    }
  }

  const rootName = this.pcToName(rootPc);
  const bassMidi = Math.min(...midiNums);
  const bassPc   = this.midiToPc(bassMidi);
  const bassName = this.pcToName(bassPc);

  // --- Tierce / sus ---
  let third = null;
  if (degrees.has('M3')) third = 'M3';
  else if (degrees.has('m3')) third = 'm3';
  else if (degrees.has('9')) third = 'sus2';
  else if (degrees.has('11')) third = 'sus4';

  // --- Quinte ---
  let fifth = null;
  if (degrees.has('b5')) fifth = 'b5';
  else if (degrees.has('#5')) fifth = '#5';
  else fifth = 'P5'; // défaut

  // --- Septième ---
  let seventh = null;
  if (degrees.has('m7')) seventh = 'm7';
  else if (degrees.has('M7')) seventh = 'M7';
  else if (degrees.has('13')&&(third == 'm3')&&( fifth == 'b5')) seventh = 'bb7';


  // --- Extensions hiérarchiques ---
  const has9  = degrees.has('9');
  const has11 = degrees.has('11');
  const has13 = degrees.has('13')&&(!((third == 'm3')&&( fifth == 'b5')));
  const has7  = !!seventh;

  let is9=false, is11=false, is13=false;
  let add9=false, add11=false, add13=false;

  if (has13 && has7) {
    is13 = true;
  } else if (has11 && has7) {
    is11 = true;
  } else if (has9 && has7) {
    is9 = true;
  }

  if (has9 && !has7) add9 = true;
  if (has11 && !has7) add11 = true;
  if (has13 && !has7) add13 = true;

  // --- Nettoyage sus (éviter sus29, sus411) ---
  if (third === 'sus2') {
    is9 = false; add9 = false;
  }
  if (third === 'sus4') {
    is11 = false; add11 = false;
  }
 console.log(degrees)
  return {
    root: rootName,
    bass: bassName,
    third,
    fifth,
    seventh,
    is9, is11, is13,
    add9, add11, add13,
    alterations: Array.from(degrees).filter(d => ['b9','#9','#11','b13'].includes(d)),
    extensions: [] // toujours défini, même si vide
  };
}

detectQuality1357(third, fifth, seventh, is9, is11, is13) {
  // Triade majeure
  if (third === 'M3' && fifth === 'P5') {
    if (is13) return (seventh === 'M7') ? 'maj13' : '13';
    if (is11) return (seventh === 'M7') ? 'maj11' : '11';
    if (is9)  return (seventh === 'M7') ? 'maj9'  : '9';
    if (seventh === 'M7') return 'maj7';
    if (seventh === 'm7') return '7';
    return ''; // triade majeure simple
  }

  // Triade mineure
  if (third === 'm3' && fifth === 'P5') {
    if (is13) return 'm13';
    if (is11) return 'm11';
    if (is9)  return 'm9';
    if (seventh === 'm7') return 'm7';
    if (seventh === 'M7') return 'mMaj7';
    return 'm';
  }

  // Triade diminuée
  if (third === 'm3' && fifth === 'b5') {
    if (is13) return 'ø13'; // demi-diminué 13
    if (is11) return 'ø11';
    if (is9)  return 'ø9';
    if (seventh === 'm7') return 'm7b5';
    if (seventh === 'bb7') return 'dim7';
    return 'dim';
  }

  // Triade augmentée
  if (third === 'M3' && fifth === '#5') {
    if (is13) return (seventh === 'M7') ? 'maj13#5' : '13#5';
    if (is11) return (seventh === 'M7') ? 'maj11#5' : '11#5';
    if (is9)  return (seventh === 'M7') ? 'maj9#5'  : '9#5';
    if (seventh === 'm7') return '7#5';
    if (seventh === 'M7') return 'maj7#5';
    return 'aug';
  }

  // Sus2
  if (third === 'sus2') {
    if (is13) return (seventh === 'M7') ? 'maj13sus2' : '13sus2';
    if (is11) return (seventh === 'M7') ? 'maj11sus2' : '11sus2';
    if (is9)  return (seventh === 'M7') ? 'maj9sus2'  : '9sus2';
    if (seventh === 'm7') return '7sus2';
    if (seventh === 'M7') return 'maj7sus2';
    return 'sus2';
  }

  // Sus4
  if (third === 'sus4') {
    if (is13) return (seventh === 'M7') ? 'maj13sus4' : '13sus4';
    if (is11) return (seventh === 'M7') ? 'maj11sus4' : '11sus4';
    if (is9)  return (seventh === 'M7') ? 'maj9sus4'  : '9sus4';
    if (seventh === 'm7') return '7sus4';
    if (seventh === 'M7') return 'maj7sus4';
    return 'sus4';
  }

  return null;
}


  // --- Génération du nom d’accord ---
formatChordName(struct) {
  let name = struct.root;

  // --- Qualité 1357 (+ extensions intégrées) ---
  const quality = this.detectQuality1357(
    struct.third,
    struct.fifth,
    struct.seventh,
    struct.is9,
    struct.is11,
    struct.is13
  );
  if (quality) name += quality;

  // --- addX ---
  if (struct.add9)  name += 'add9';
  if (struct.add11) name += 'add11';
  if (struct.add13) name += 'add13';

  // --- Altérations éventuelles ---
  if (struct.alterations && struct.alterations.length > 0) {
    name += '(' + struct.alterations.join(',') + ')';
  }

  // --- Slash chord ---
  if (struct.bass && struct.bass !== struct.root) {
    name += '/' + struct.bass;
  }

  return name;
}



buildSignatureFromStructure(struct, rootPc) {
  const intervals = [0]; // fondamentale

// Triade de base (tierce/sus + quinte)
if (struct.third === 'M3' && struct.fifth === 'P5') {
  intervals.push(4,7); // majeur
} else if (struct.third === 'm3' && struct.fifth === 'P5') {
  intervals.push(3,7); // mineur
} else if (struct.third === 'm3' && struct.fifth === 'b5') {
  intervals.push(3,6); // diminué
} else if (struct.third === 'M3' && struct.fifth === '#5') {
  intervals.push(4,8); // augmenté
} else if (struct.third === 'sus2') {
  intervals.push(2,7); // sus2
} else if (struct.third === 'sus4') {
  intervals.push(5,7); // sus4
} else {
  // cas non valide → on peut décider de ne rien pousser,
  // ou de requalifier en triade la plus proche
}


  // Septième
  if (struct.seventh === 'm7') intervals.push(10);
  else if (struct.seventh === 'M7') intervals.push(11);
  else if (struct.seventh === 'bb7') intervals.push(9);

  // Extensions hiérarchiques
  if (struct.is13) {
    if (!intervals.includes(10) && !intervals.includes(11)) intervals.push(10); // m7 par défaut
    intervals.push(14,17,21); // 9, 11, 13
  } else if (struct.is11) {
    if (!intervals.includes(10) && !intervals.includes(11)) intervals.push(10);
    intervals.push(14,17);
  } else if (struct.is9) {
    if (!intervals.includes(10) && !intervals.includes(11)) intervals.push(10);
    intervals.push(14);
  }

  // addX (sans 7e)
  if (struct.add9) intervals.push(14);
  if (struct.add11) intervals.push(17);
  if (struct.add13) intervals.push(21);

  console.log(intervals)
  // Conversion en pitch classes
  const chordPcs = new Set(intervals.map(iv => (rootPc + iv) % 12));

  // Slash chord
  if (struct.bass && struct.bass !== struct.root) {
    const bassPc = this.noteToPc[struct.bass];
    chordPcs.add(bassPc);
  }

  return Array.from(chordPcs);
}




// --- Nouveau scoring basé sur la structure (avec slash pris en compte) ---
scoreStructure(midiNums, struct, rootPc) {
  const playedPcs = new Set(midiNums.map(n => this.midiToPc(n)));
  const chordPcs = this.buildSignatureFromStructure(struct, rootPc);

  let covered = 0;
  for (const pc of chordPcs) {
    if (playedPcs.has(pc)) covered++;
  }

  const coverage = covered / chordPcs.length;
  return { coverage, size: chordPcs.length, covered };
}


  debugScores(midiNums, results) {
    for (const r of results) {
      const rootPc = this.noteToPc[r.root];
      const { coverage, size, covered } = this.scoreStructure(midiNums, r, rootPc);
      console.log(`${r.label} -> ${(coverage*100).toFixed(0)}% (${covered}/${size})`);
    }
  }

  sortByPriority(results, midiNums = []) {
    const scored = results.map(r => {
      const rootPc = this.noteToPc[r.root];
      const { coverage, size, covered } = this.scoreStructure(midiNums, r, rootPc);
      return { ...r, coverage, size, covered };
    });

    scored.sort((a, b) => {
      if (b.coverage !== a.coverage) return b.coverage - a.coverage;
      if (b.covered !== a.covered) return b.covered - a.covered;
      if (a.size !== b.size) return a.size - b.size;
      const aSlash = a.label.includes('/');
      const bSlash = b.label.includes('/');
      if (aSlash !== bSlash) return aSlash ? 1 : -1;
      return 0;
    });

    return scored;
  }

  // --- Utilitaires ---
  getUniquePcs(midiNums) {
    return Array.from(new Set(midiNums.map(n => this.midiToPc(n)))).sort((a, b) => a - b);
  }

  deduplicate(results) {
    const seen = new Set();
    return results.filter(r => {
      if (seen.has(r.label)) return false;
      seen.add(r.label);
      return true;
    });
  }

  midiToPc(m) { return ((m % 12) + 12) % 12; }
  pcToName(pc) { return this.noteNames[pc]; }
}
