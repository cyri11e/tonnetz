class ChordDetector {
  constructor() {
    this.chordFormulas = {
      '':     [0, 4, 7],
      'm':    [0, 3, 7],
      'dim':  [0, 3, 6],
      'aug':  [0, 4, 8],
      'sus2': [0, 2, 7],
      'sus4': [0, 5, 7],
      '7':    [0, 4, 7, 10],
      'm7':   [0, 3, 7, 10],
      'maj7': [0, 4, 7, 11],
      'mMaj7':[0, 3, 7, 11],
      'dim7': [0, 3, 6, 9],
      'm7b5': [0, 3, 6, 10],
      '6':    [0, 4, 7, 9],
      'm6':   [0, 3, 7, 9],
      '9':    [0, 4, 7, 10, 14],
      'maj9': [0, 4, 7, 11, 14],
      'm9':   [0, 3, 7, 10, 14],
      '11':   [0, 4, 7, 10, 17],
      '13':   [0, 4, 7, 10, 21]
    };

    this.noteToPc = {
      'C':0, 'C♯':1,'D♭':1,'D':2,'D♯':3,'E♭':3,
      'E':4,'F':5,'F♯':6,'G♭':6,'G':7,'G♯':8,
      'A♭':8,'A':9,'A♯':10,'B♭':10,'B':11
    };

    this.pcToNote = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
  }

detect(activeNotes, midiNumbers = null) {
  const currentNotation = ENHARMONIC_MAPS[tonnetz.noteStyle];
  this.pcToNote = currentNotation;

  let pcs, bassNote, midiList;
  if (Array.isArray(midiNumbers) && midiNumbers.length) {
    midiList = [...new Set(midiNumbers)].sort((a,b) => a - b);
    bassNote = this.pcToNote[midiList[0] % 12];
    pcs = [...new Set(midiList.map(n => n % 12))].sort((a,b) => a - b);
  } else {
    const map = {};
    currentNotation.forEach((n,i) => map[n] = i);
    midiList = activeNotes.map(n => map[n]);
    bassNote = this.pcToNote[midiList[0]];
    pcs = [...new Set(midiList)].sort((a,b) => a - b);
  }

  const results = [];

  pcs.forEach(rootPc => {
    // --- Filtrage fondamentales graves parasites ---
    const medianNote = midiList[Math.floor(midiList.length / 2)];
    const midiListForAnalysis = midiList.filter(n => {
      const isSamePcAsRoot = (n % 12) === rootPc;
      const tooLow = n < medianNote - 12;
      return !(isSamePcAsRoot && tooLow);
    });
    // ----------------------------------------------

    const rootMidi = midiListForAnalysis.find(n => n % 12 === rootPc);

    // --- Fondamentale virtuelle pour 1er renversement ---
    const bassPc = midiList[0] % 12;
    const intervalBassToRoot = (rootPc - bassPc + 12) % 12;
    if (intervalBassToRoot === 3 || intervalBassToRoot === 4) {
      rootPc = (bassPc - intervalBassToRoot + 12) % 12;
    }
    // ----------------------------------------------------

    const intervalsAbs = rootMidi == null
      ? []
      : midiListForAnalysis.map(n => {
          let iv = n - rootMidi;
          while (iv < 0)  iv += 12;
          while (iv > 23) iv -= 12;
          return iv;
        });

    let intervalsPC = pcs
      .map(pc => (pc - rootPc + 12) % 12)
      .sort((a,b) => a - b);

    if (intervalsPC.includes(3) && intervalsPC.includes(4))
      intervalsPC = intervalsPC.filter(iv => iv !== 4);
    if (intervalsPC.includes(4) && intervalsPC.includes(1))
      intervalsPC = intervalsPC.filter(iv => iv !== 1);

    for (const [name, formula] of Object.entries(this.chordFormulas)) {
      if (!formula.every(iv => intervalsPC.includes(iv))) continue;

      const has7 = intervalsPC.includes(10) || intervalsPC.includes(11);
      if (has7 && (name === '6' || name === 'm6')) continue;

      let chordName = this.pcToNote[rootPc] + name;

      const hasMin3 = intervalsPC.includes(3);
      const hasMaj3 = intervalsPC.includes(4);

      // sus→add si tierce présente
      if ((name === 'sus2' || name === 'sus4') && (hasMin3 || hasMaj3)) {
        if (name === 'sus2') chordName = this.pcToNote[rootPc] + 'add2';
        if (name === 'sus4') chordName = this.pcToNote[rootPc] + 'add4';
      }

      if (intervalsAbs.length) {
        if (!has7) {
          const has2  = intervalsAbs.includes(2);
          const has9  = intervalsAbs.includes(14);
          const has4  = intervalsAbs.includes(5);
          const has11 = intervalsAbs.includes(17);
          const has13 = intervalsAbs.includes(21);

          if (!chordName.includes('sus2') && !chordName.includes('add2')) {
            if (has9)      chordName += 'add9';
            else if (has2) chordName += 'add2';
          } else if (chordName.includes('add2') && has9) {
            chordName = chordName.replace('add2', 'add9');
          }

          if (!chordName.includes('sus4') && !chordName.includes('add4')) {
            if (has11)     chordName += 'add11';
            else if (has4) chordName += 'add4';
          } else if (chordName.includes('add4') && has11) {
            chordName = chordName.replace('add4', 'add11');
          }

          if (has13) chordName += 'add13';
        } else {
          if      (intervalsAbs.includes(21)) chordName = chordName.replace('7','13');
          else if (intervalsAbs.includes(17)) chordName = chordName.replace('7','11');
          else if (intervalsAbs.includes(14)) chordName = chordName.replace('7','9');
        }
      }

      const alts = [];
      if (intervalsAbs.includes(13) && !hasMaj3) alts.push('b9');
      if (intervalsAbs.includes(15) && !hasMin3) alts.push('♯9');
      if (intervalsAbs.includes(18)) alts.push('♯11');
      if (intervalsAbs.includes(20)) alts.push('♭13');
      if (alts.length) chordName += `(${alts.join(',')})`;

      const baseCount = formula.filter(iv => intervalsPC.includes(iv)).length;

      let extIntervals = [14,17,21];
      if (chordName.includes('add2') && !chordName.includes('add9'))  extIntervals.push(2);
      if (chordName.includes('add4') && !chordName.includes('add11')) extIntervals.push(5);
      const extCount = extIntervals.filter(iv => intervalsAbs.includes(iv)).length;

      const altCount  = alts.length;
      const recognizedNotes = baseCount + extCount + altCount;
      const totalNotes      = formula.length + extCount + altCount;
      chordName += ` ${recognizedNotes}/${totalNotes}`;

      const chordPCs = new Set([
        ...formula,
        ...[14,17,21].filter(iv => intervalsAbs.includes(iv)),
        ...alts.map(a => {
          if (a === 'b9') return 13;
          if (a === '♯9') return 15;
          if (a === '♯11') return 18;
          if (a === '♭13') return 20;
          return null;
        }).filter(v => v !== null)
      ]);
      const chordPCsAbs = [...chordPCs].map(iv => (rootPc + iv) % 12).sort((a,b) => a - b);
      const chordSignature = chordPCsAbs.join(',');

      results.push({
        root: this.pcToNote[rootPc],
        type: chordName.replace(this.pcToNote[rootPc], ''),
        bass: bassNote,
        formulaSize: formula.length,
        recognizedNotes,
        totalNotes,
        chordSignature
      });
    }
  });

  results.forEach(r => {
    if (r.bass !== r.root) {
      r.type = r.type ? `${r.type}/${r.bass}` : `/${r.bass}`;
    }
  });

  // Tri : accords les plus complets d'abord
  results.sort((a, b) => {
    if (b.recognizedNotes !== a.recognizedNotes) return b.recognizedNotes - a.recognizedNotes;
    if (b.totalNotes !== a.totalNotes) return b.totalNotes - a.totalNotes;
    const ra = a.recognizedNotes / a.totalNotes;
    const rb = b.recognizedNotes / b.totalNotes;
    if (rb !== ra) return rb - ra;
    return b.formulaSize - a.formulaSize;
  });

  // Filtrage : éliminer les sous-ensembles
  const filtered = [];
  for (const chord of results) {
    const sigArr = chord.chordSignature.split(',').map(Number);
    let isSubset = false;
    for (const kept of filtered) {
      const biggerArr = kept.chordSignature.split(',').map(Number);
      if (sigArr.every(n => biggerArr.includes(n)) && biggerArr.length > sigArr.length) {
        isSubset = true;
        break;
      }
    }
    if (!isSubset) filtered.push(chord);
  }

  return filtered;
}



}
