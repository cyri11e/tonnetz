class ChordDetector {
  constructor() {
    this.noteNames = [
  "C",   // 0
  "Db",  // 1
  "D",   // 2
  "Eb",  // 3
  "E",   // 4
  "F",   // 5
  "Gb",  // 6
  "G",   // 7
  "Ab",  // 8
  "A",   // 9
  "Bb",  // 10
  "B"    // 11
];
    this.noteToPc = {
      'C':0, 'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,
      'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,
      'Ab':8,'A':9,'A#':10,'Bb':10,'B':11
    };

    this._lastMidiKey = '';
    this._lastResults = [];
    this.unitTest()
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
      console.log('------------')
      const structure = this.analyzeIntervals(midiNums, rootPc);
      if (!structure) continue;

      const label = toUnicodeAlteration(this.formatChordName(structure).main);
      const altLabel = toUnicodeAlteration(this.formatChordName(structure).alt);

      results.push({
        ...structure,
        label, 
        altLabel
      });
    }

    let unique = this.deduplicate(results);
    return this.sortByPriority(unique, midiNums);
  }
toNoteObjects(midiNums, rootPc) {
  return midiNums.map(m => {
    const pc = this.midiToPc(m);
    const note = this.pcToName(pc);
    const iv = ((m - rootPc) % 12 + 12) % 12; // intervalle relatif à la fondamentale

    return {
      midi: m,
      pc,
      note,
      iv,
      func: null // fonction musicale, qu’on remplira après
    };
  });
}

analyzeIntervals(midiNums, rootPc) {
  if (!midiNums || midiNums.length === 0) return null;

  const notes = this.toNoteObjects(midiNums, rootPc);
  const degrees = new Set(notes.map(n => n.iv));

  const rootName = this.pcToName(rootPc);
  const bassMidi = Math.min(...midiNums);
  const bassPc   = this.midiToPc(bassMidi);
  const bassName = this.pcToName(bassPc);

  // --- Détection tierce / sus ---
  let third = null;
  if (degrees.has(4)) third = 'M3';
  else if (degrees.has(3)) third = 'm3';
  else if (degrees.has(2) && degrees.has(7)) third = 'sus2';
  else if (degrees.has(5) && degrees.has(7)) third = 'sus4';

  if (!third) return null;

  // --- Quinte ---
  let fifth = null;
  if (degrees.has(7)) fifth = 'P5';
  else if (degrees.has(6)) fifth = 'b5';
  else if (degrees.has(8) && third === 'M3') fifth = '#5';

  // --- Septième ---
  let seventh = null;
  if (degrees.has(10)) seventh = 'm7';
  else if (degrees.has(11)) seventh = 'M7';
  else if (degrees.has(9) && third === 'm3' && fifth === 'b5') seventh = 'bb7';

  // --- Extensions hiérarchiques ---
  const has9  = degrees.has(2) && third !== 'sus2';
  const has11 = degrees.has(5) && third !== 'sus4';
  const has13 = degrees.has(9) && !(third === 'm3' && fifth === 'b5');
  const has7  = !!seventh;

  let is9=false, is11=false, is13=false;
  let add9=false, add11=false, add13=false;

  if (has13 && has7) is13 = true;
  else if (has11 && has7) is11 = true;
  else if (has9 && has7)  is9 = true;

  if (has9 && !has7)  add9 = true;
  if (has11 && !has7) add11 = true;
  if (has13 && !has7) add13 = true;

  // --- Nettoyage sus ---
  if (third === 'sus2') { is9 = false; add9 = false; }
  if (third === 'sus4') { is11 = false; add11 = false; }

  if (!fifth && !seventh) return null;

  // --- Altérations d’extensions ---
  let alterations = [];
  if (degrees.has(1)) alterations.push('♭9');             // Db
  if (degrees.has(3) && third !== 'm3') alterations.push('♯9'); // D# (éviter confusion avec m3)
  // ⚠️ Cas particulier : éviter ♯11 sur accords diminués
  if (degrees.has(6)) {
    if (!(third === 'm3' && fifth === 'b5')) {
      alterations.push('♯11');
    }
  }
  if (degrees.has(8) && fifth !== '#5') alterations.push('♭13'); // Ab

  // --- Attribution des fonctions aux notes ---
  for (const n of notes) {
    switch (n.iv) {
      case 0:  n.func = "R"; break;
      case 3:  n.func = "m3"; break;
      case 4:  n.func = "M3"; break;
      case 6:  n.func = "♯11"; break; // utilisé aussi comme ♭5 si triade diminuée
      case 7:  n.func = "5"; break;
      case 8:  n.func = alterations.includes('♭13') ? "♭13" : "♯5"; break;
      case 10: n.func = "m7"; break;
      case 11: n.func = "M7"; break;

      case 1: if (alterations.includes('♭9')) n.func = "♭9"; break;
      case 2:
        if (third === 'sus2') n.func = "sus2";
        else if (is9 || is11 || is13) n.func = "9";
        else if (add9) n.func = "add9";
        break;
      case 3:
        if (alterations.includes('♯9') && third !== 'm3') n.func = "♯9";
        break;
      case 5:
        if (third === 'sus4') n.func = "sus4";
        else if (is11 || is13) n.func = "11";
        else if (add11) n.func = "add11";
        break;
      case 9:
        if (third === 'm3' && fifth === 'b5') {
          n.func = "♭♭7";
        } else if (is13) {
          n.func = "13";
        } else if (add13 && (third === 'M3' || third === 'm3')) {
          n.func = "6";
        }
        break;
    }
  }

  return {
    root: rootName,
    bass: bassName,
    third,
    fifth,
    seventh,
    is9, is11, is13,
    add9, add11, add13,
    alterations,
    extensions: [],
    notes
  };
}



detectQuality1357(third, fifth, seventh, is9, is11, is13) {
  // Triade majeure
  if ((third === 'M3') && (fifth !== 'b5') && (fifth !== '#5')){
    if (is13) return (seventh === 'M7') ? 'maj13' : '13';
    if (is11) return (seventh === 'M7') ? 'maj11' : '11';
    if (is9)  return (seventh === 'M7') ? 'maj9'  : '9';
    if (seventh === 'M7') return 'maj7';
    if (seventh === 'm7') return '7';
    return ''; // triade majeure simple
  }

  // Triade mineure
  if (third === 'm3' && (fifth !== 'b5') && (fifth !== '#5')) {
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
if (struct.add13) {
  if (!struct.seventh && struct.third.includes('3')) {
    name += '6';
  } else {
    name += 'add13';
  }
}

if (struct.add9)  name += 'add9';
if (struct.add11) name += 'add11';

  

  // --- Altérations éventuelles ---
  if (struct.alterations && struct.alterations.length > 0) {
    name +=  struct.alterations.join(',') ;
  }

// --- Slash chord ---
let alt = '';
if (struct.bass && struct.bass !== struct.root) {
  console.log('recherche nom alternatif pour ' + name);
  const interval = (this.noteToPc[struct.bass] - this.noteToPc[struct.root] + 12) % 12;

  // mapping extension -> interval
  const extMap = {
    'add9'  : 2,
    'maj9'  : 2,
    'add11' : 5,
    'maj11' : 5,
    'add13' : 9,
    'maj13' : 9
  };

  for (const ext in extMap) {
    if (extMap[ext] === interval && name.includes(ext)) {
      if (ext.startsWith('add')) {
        console.log('add trouvé');
        alt = name.replace(ext, '') + '/' + struct.bass;
      } else if (ext.startsWith('maj')) {
        console.log('maj trouvé');
        const prev = {
          'maj9':  'maj7',
          'maj11': 'maj9',
          'maj13': 'maj11'
        };
        alt = name.replace(ext, prev[ext]) + '/' + struct.bass;
      }
    }
  }

  if (!alt) {
    // sinon, garder le slash complet
    name += '/' + struct.bass;
  }
}
if (!struct.fifth) name += '(no5)';
//if (!struct.seventh) name += '(no7)';
return { main: name, alt: alt };
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

  //console.log(intervals)
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
  
  // Bonus : si la basse jouée correspond à la fondamentale de l'accord
  const bassPc = this.midiToPc(Math.min(...midiNums));

  if (bassPc === rootPc) {
    covered += 2;
  }

  const coverage = covered / chordPcs.length 
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

  unitTest() {
    console.log("=== UNIT TEST CHORD DETECTOR ===");
const tests = [
  // --- Triades ---
  { expect: "C",     midi: [60,64,67] },       // C E G
  { expect: "C/E",   midi: [64,67,72] },       // E G C
  { expect: "C/G",   midi: [67,72,76] },       // G C E

  { expect: "Cm",    midi: [60,63,67] },       // C Eb G
  { expect: "Cm/Eb", midi: [63,67,72] },       // Eb G C
  { expect: "Cm/G",  midi: [67,72,75] },       // G C Eb

  { expect: "Cdim",  midi: [60,63,66] },       // C Eb Gb
  { expect: "Cdim/Eb", midi: [63,66,72] },     // Eb Gb C
  { expect: "Cdim/Gb", midi: [66,72,75] },     // Gb C Eb

  { expect: "Caug",  midi: [60,64,68] },       // C E G#
  { expect: "Caug/E", midi: [64,68,72] },      // E G# C
  { expect: "Caug/G#", midi: [68,72,76] },     // G# C E

  { expect: "Csus2", midi: [60,62,67] },       // C D G
  { expect: "Csus2/D", midi: [62,67,72] },     // D G C
  { expect: "Csus2/G", midi: [67,72,74] },     // G C D

  { expect: "Csus4", midi: [60,65,67] },       // C F G
  { expect: "Csus4/F", midi: [65,67,72] },     // F G C
  { expect: "Csus4/G", midi: [67,72,77] },     // G C F

  // --- Septièmes ---
  { expect: "Cmaj7", midi: [60,64,67,71] },
  { expect: "C7",    midi: [60,64,67,70] },
  { expect: "Cm7",   midi: [60,63,67,70] },
  { expect: "Cdim7", midi: [60,63,66,69] },

    // Cmaj7 inversions
  { expect: "Cmaj7/E", midi: [64,67,71,72] }, // E G B C
  { expect: "Cmaj7/G", midi: [67,71,72,76] }, // G B C E
  { expect: "Cmaj7/B", midi: [71,72,76,79] }, // B C E G

  // C7 inversions
  { expect: "C7/E", midi: [64,67,70,72] },    // E G Bb C
  { expect: "C7/G", midi: [67,70,72,76] },    // G Bb C E
  { expect: "C7/Bb", midi: [70,72,76,79] },   // Bb C E G

  // Cm7 inversions
  { expect: "Cm7/Eb", midi: [63,67,70,72] },  // Eb G Bb C
  { expect: "Cm7/G",  midi: [67,70,72,75] },  // G Bb C Eb
  { expect: "Cm7/Bb", midi: [70,72,75,79] },  // Bb C Eb G

  // Cdim7 inversions
  { expect: "Cdim7/Eb", midi: [63,66,69,72] }, // Eb Gb A C (Bbb = A)
  { expect: "Cdim7/Gb", midi: [66,69,72,75] }, // Gb A C Eb
  { expect: "Cdim7/A",  midi: [69,72,75,78] }, // A C Eb Gb

  // --- Septièmes sans quinte ---
  { expect: "Cmaj7(no5)", midi: [60,64,71] },
  { expect: "C7(no5)",    midi: [60,64,70] },
  { expect: "Cm7(no5)",   midi: [60,63,70] },

  // --- 9èmes ---
  { expect: "C9",     midi: [60,64,67,70,74] },
  { expect: "Cadd9",  midi: [60,64,67,74] },
  { expect: "C9(no5)",midi: [60,64,70,74] },

  // --- 11èmes ---
  { expect: "C11",       midi: [60,64,67,70,74,77] },
  { expect: "C11(no5)",  midi: [60,64,70,74,77] },
  { expect: "C11(no7)",  midi: [60,64,67,74,77] },
  { expect: "C11(no9)",  midi: [60,64,67,70,77] },

  // --- 13èmes ---
  { expect: "C13",       midi: [60,64,67,70,74,77,81] },
  { expect: "C13(no5)",  midi: [60,64,70,74,77,81] },
  { expect: "C13(no7)",  midi: [60,64,67,74,77,81] },
  { expect: "C13(no9)",  midi: [60,64,67,70,77,81] },
  { expect: "C13(no11)", midi: [60,64,67,70,74,81] },
];


    for (const t of tests) {
      const res = this.analyzeIntervals(t.midi, 0); // rootPc = C
      const label = res ? this.formatChordName(res) : "null";
      if (label === t.expect) {
        console.log("✔", t.expect, "OK");
      } else {
        console.error("✖", t.expect, "=>", label);
      }
    }
  }
}
