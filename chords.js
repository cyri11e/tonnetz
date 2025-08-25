class ChordDetector {
  constructor() {
    this.chordFormulas = {
      '':       [0, 4, 7],
      'm':      [0, 3, 7],
      'dim':    [0, 3, 6],
      'aug':    [0, 4, 8],
      'sus2':   [0, 2, 7],
      'sus4':   [0, 5, 7],
      '7':      [0, 4, 7, 10],
      'm7':     [0, 3, 7, 10],
      'maj7':   [0, 4, 7, 11],
      'mMaj7':  [0, 3, 7, 11],
      'dim7':   [0, 3, 6, 9],
      'm7b5':   [0, 3, 6, 10],
      '6':      [0, 4, 7, 9],
      'm6':     [0, 3, 7, 9],
      '9':      [0, 4, 7, 10, 14],
      'maj9':   [0, 4, 7, 11, 14],
      'm9':     [0, 3, 7, 10, 14],
      '11':     [0, 4, 7, 10, 17],
      '13':     [0, 4, 7, 10, 21]
    };

    this.noteToPc = {
      'C':0, 'C♯':1, 'D♭':1, 'D':2, 'D♯':3, 'E♭':3,
      'E':4, 'F':5, 'F♯':6, 'G♭':6, 'G':7, 'G♯':8, 'A♭':8,
      'A':9, 'A♯':10, 'B♭':10, 'B':11
    };

    this.pcToNote = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
  }

  detect(activeNotes, midiNumbers = null) {
    // Met à jour la notation enharmonique selon le Tonnetz
    const currentNotation = ENHARMONIC_MAPS[tonnetz.noteStyle];
    this.pcToNote = currentNotation;

    let pcs, bassNote, midiList;

    if (Array.isArray(midiNumbers) && midiNumbers.length > 0) {
      midiList = [...new Set(midiNumbers)].sort((a,b) => a - b);
      const bassMidi = midiList[0];
      bassNote = this.pcToNote[bassMidi % 12];
      pcs = [...new Set(midiList.map(m => m % 12))].sort((a,b) => a - b);
    } else {
      const noteToPc = {};
      currentNotation.forEach((note, pc) => {
        noteToPc[note] = pc;
      });
      midiList = activeNotes.map(n => noteToPc[n]);
      bassNote = this.pcToNote[midiList[0]];
      pcs = [...new Set(midiList)].sort((a,b) => a - b);
    }

    const results = [];

    pcs.forEach(rootPc => {
      let rootMidi = null;
      if (midiList.length && typeof midiList[0] === 'number') {
        rootMidi = midiList.find(m => m % 12 === rootPc);
      }

      const intervalsAbs = rootMidi !== null
        ? midiList.map(m => {
            let iv = m - rootMidi;
            while (iv < 0) iv += 12;
            while (iv > 23) iv -= 12;
            return iv;
          })
        : [];

      let intervalsPC = pcs
        .map(pc => (pc - rootPc + 12) % 12)
        .sort((a,b) => a - b);

      // Filtrage enharmonique (#9 vs b9)
      if (intervalsPC.includes(3) && intervalsPC.includes(4)) {
        intervalsPC = intervalsPC.filter(iv => iv !== 4);
      }
      if (intervalsPC.includes(4) && intervalsPC.includes(1)) {
        intervalsPC = intervalsPC.filter(iv => iv !== 1);
      }

      for (const [name, formula] of Object.entries(this.chordFormulas)) {
        if (!formula.every(iv => intervalsPC.includes(iv))) continue;

        const has7 = intervalsPC.includes(10) || intervalsPC.includes(11);

        // Ne pas nommer « 6 » quand une 7 est présente
        if (has7 && (name === '6' || name === 'm6')) continue;

        let chordName = this.pcToNote[rootPc] + name;

        // Extensions (add9, add11, add13) ou remplacements en 9/11/13
        if (intervalsAbs.length) {
          if (!has7) {
            if (intervalsAbs.includes(14)) chordName += 'add9';
            if (intervalsAbs.includes(17)) chordName += 'add11';
            if (intervalsAbs.includes(21)) chordName += 'add13';
          } else {
            if (intervalsAbs.includes(21)) {
              chordName = this.pcToNote[rootPc] + name.replace('7', '13');
            } else if (intervalsAbs.includes(17)) {
              chordName = this.pcToNote[rootPc] + name.replace('7', '11');
            } else if (intervalsAbs.includes(14)) {
              chordName = this.pcToNote[rootPc] + name.replace('7', '9');
            }
          }
        }

        // Altérations
        const alterations = [];
        const hasMinor3 = formula.includes(3);
        const hasMajor3 = formula.includes(4);

        if (intervalsAbs.includes(13) && !hasMajor3) alterations.push('b9');
        if (intervalsAbs.includes(15) && !hasMinor3) alterations.push('♯9');
        if (intervalsAbs.includes(18)) alterations.push('♯11');
        if (intervalsAbs.includes(20)) alterations.push('♭13');

        if (alterations.length) {
          chordName += `(${alterations.join(',')})`;
        }

        results.push({
          root: this.pcToNote[rootPc],
          type: chordName.replace(this.pcToNote[rootPc], ''),
          bass: bassNote,
          formulaSize: formula.length
        });
      }
    });

    // Indiquer les renversements si nécessaire
    results.forEach(r => {
      if (r.bass !== r.root) {
        r.type = r.type ? `${r.type}/${r.bass}` : `/${r.bass}`;
      }
    });

    // Tri optionnel : garder cette logique ou la déplacer en amont/aval
    results.sort((a, b) => {
      const aBassMatch = a.bass === a.root ? 1 : 0;
      const bBassMatch = b.bass === b.root ? 1 : 0;
      if (aBassMatch !== bBassMatch) return bBassMatch - aBassMatch;
      return b.formulaSize - a.formulaSize;
    });

    // Retourne tous les accords détectés
    return results;
  }
}