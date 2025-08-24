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

    this.intervalWeights = {
      0: 5, 3: 4, 4: 4, 6: 4.5, 7: 3, 10: 3, 11: 3,
      9: 2, 2: 1, 5: 1, 14: 1, 17: 1, 21: 1
    };
  }

  detect(activeNotes, midiNumbers = null) {
    let midiList = Array.isArray(midiNumbers) && midiNumbers.length > 0
      ? [...new Set(midiNumbers)].sort((a,b) => a-b)
      : activeNotes.map(n => this.noteToPc[n]).sort((a,b) => a-b);

    if (midiList.length === 0) return [];

    const bassMidi = midiList[0];
    const bassPc = bassMidi % 12;
    const pcs = [...new Set(midiList.map(m => m % 12))].sort((a,b) => a-b);

    // 1. Calculer tous les candidats sans bonus basse
    let candidates = [];
    for (const candidate of pcs) {
      const intervalsPC = pcs.map(pc => (pc - candidate + 12) % 12).sort((a,b) => a-b);
      for (const [name, formula] of Object.entries(this.chordFormulas)) {
        let score = 0;
        for (let iv of formula) {
          if (intervalsPC.includes(iv)) score += this.intervalWeights[iv] || 0;
        }
        if (formula.every(iv => intervalsPC.includes(iv))) score += 0.5;

        candidates.push({
          rootPc: candidate,
          name,
          formula,
          score,
          intervalsPC
        });
      }
    }

    // 2. Meilleur score brut
    let bestScore = Math.max(...candidates.map(c => c.score));
    let bestCandidates = candidates.filter(c => c.score === bestScore);

    // 3. Si plusieurs accords → vérifier si même set de notes
    if (bestCandidates.length > 1) {
      const pcsSet = JSON.stringify(pcs);
      const exactMatches = bestCandidates.filter(c =>
        JSON.stringify(c.intervalsPC) === pcsSet
      );

      // 4. Si plusieurs exactMatches → départager avec la basse
      if (exactMatches.length > 1) {
        const bassMatch = exactMatches.find(c => c.rootPc === bassPc);
        if (bassMatch) bestCandidates = [bassMatch];
      }
    }

    // 5. Choisir le premier restant
    const best = bestCandidates[0];
    const rootPc = best.rootPc;
    const rootNote = this.pcToNote[rootPc];
    const rootMidi = midiList.find(m => m % 12 === rootPc) ?? midiList[0];
    const intervalsAbs = midiList.map(m => {
      let iv = m - rootMidi;
      while (iv < 0) iv += 12;
      return iv;
    });
    const intervalsPC = pcs.map(pc => (pc - rootPc + 12) % 12).sort((a,b) => a-b);

    let chordName = rootNote + best.name;
    const has7 = intervalsPC.includes(10) || intervalsPC.includes(11);

    // Extensions
    if (!has7) {
      if (intervalsPC.includes(2) && !best.formula.includes(2)) {
        const candidates = midiList.filter(m => (m - rootMidi + 120) % 12 === 2);
        const closestAbove = Math.min(...candidates.filter(m => m > rootMidi));
        if (closestAbove - rootMidi < 5) chordName += 'add2';
        else chordName += 'add9';
      }
      if (intervalsAbs.includes(17) && !best.formula.includes(5)) chordName += 'add11';
      if (intervalsAbs.includes(21) && !best.formula.includes(9)) chordName += 'add13';
    } else {
      if (intervalsAbs.includes(21)) {
        if (best.name.includes('maj')) chordName = rootNote + 'maj13';
        else if (best.name.includes('m')) chordName = rootNote + 'm13';
        else chordName = rootNote + '13';
      }
      else if (intervalsAbs.includes(17)) {
        if (best.name.includes('maj')) chordName = rootNote + 'maj11';
        else if (best.name.includes('m')) chordName = rootNote + 'm11';
        else chordName = rootNote + '11';
      }
      else if (intervalsAbs.includes(14)) {
        if (best.name.includes('maj')) chordName = rootNote + 'maj9';
        else if (best.name.includes('m')) chordName = rootNote + 'm9';
        else chordName = rootNote + '9';
      }
    }

    // Altérations
    const alterations = [];
    const hasMinor3 = best.formula.includes(3);
    const hasMajor3 = best.formula.includes(4);
    if (intervalsAbs.includes(13) && !hasMajor3) alterations.push('b9');
    if (intervalsAbs.includes(15) && !hasMinor3) alterations.push('#9');
    if (intervalsAbs.includes(18)) alterations.push('#11');
    if (intervalsAbs.includes(20)) alterations.push('b13');
    if (alterations.length > 0) chordName += `(${alterations.join(',')})`;

    // Inversion
    const intervalBassRoot = (bassPc - rootPc + 12) % 12;
    if (intervalBassRoot !== 0) chordName += `/${this.pcToNote[bassPc]}`;

    return [{
      root: rootNote,
      type: chordName.replace(rootNote, ''),
      bass: this.pcToNote[bassPc],
      formulaSize: best.formula.length,
      score: bestScore
    }];
  }
}
