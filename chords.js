class ChordDetector {
  constructor() {
    // 1) on trie la librairie par taille décroissante
    // prevoir un pré tri
    this.chordLibrary = this.buildChordLibrary()
      .sort((a, b) => b.intervals.length - a.intervals.length);

    // 2) signatures d’extensions 
    this.extSignatures = extSignatures
   
    this.noteNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  
    this.noteToPc = {
      'C':0, 'C♯':1,'D♭':1,'D':2,'D♯':3,'E♭':3,
      'E':4,'F':5,'F♯':6,'G♭':6,'G':7,'G♯':8,
      'A♭':8,'A':9,'A♯':10,'B♭':10,'B':11
    };
    // dans constructor()
    this._lastMidiKey = '';   // représentation canonique du dernier jeu de midis
    this._lastResults = [];   // cache des résultats pour ce jeu

  }

  detect(activeNotesNames, midiNumbers = null) {
    const midiNums = Array.isArray(midiNumbers) ? midiNumbers : [];
    const key = midiNums.slice().sort((a, b) => a - b).join(',');

    // si identique au dernier jeu, renvoyer le cache
    if (key === this._lastMidiKey) {
      return this._lastResults;
    }

    // sinon recalculer, mettre à jour le cache et retourner
    const chords = this.recognizeChord(midiNums);
    this._lastMidiKey = key;
    this._lastResults = chords;
    return chords;
  }


  recognizeChord(midiNums, options = {}, missingFifthRecursed =false) {
    console.log('detection d accords ');
    const {
      strict        = true,
      preferSixth   = false,
      omitFifth     = true
    } = options;
    if (!midiNums || midiNums.length === 0) return [];

    // 1. extraction des pitch-classes
    const pcs     = this.getUniquePcs(midiNums);
    const results = [];

    // 2–7. détection pour chaque root candidate
    for (const rootPc of this.findRootCandidates(pcs)) {
      const { semis, semisMod, rootName } = this.computeSemis(midiNums, rootPc);

      for (const chord of this.chordLibrary) {
        if (!this.matchesSkeleton(chord.intervals, semisMod)) continue;

        let usedIntervals = chord.intervals.slice();
        let chordLabel         = rootName + chord.label;

        const extInfo = this.detectExtension(chord.label, semis, semisMod);
        if (extInfo) {
          usedIntervals = extInfo.usedIntervals.slice();
          chordLabel         = rootName + extInfo.label;
        }

        if (!this.coversAll(usedIntervals, semisMod)) continue;

        results.push(
          ...this.buildChordResults(midiNums, rootPc, chordLabel, usedIntervals)
        );
      }
    }

    // 8. déduplication
    let unique = this.deduplicate(results);

    // 9. tri selon priorité pure vs slash
    let ordered = this.sortByPriority(unique, strict);

    // 10. option preferSixth
    if (preferSixth) {
      ordered = this.filterPreferSixth(ordered);
    }

      if (
      ordered.length === 0 &&
      omitFifth &&
      !missingFifthRecursed &&
      midiNums.length >= 4
    ) {
      // on tente de retirer la quinte une fois pour chaque root possible
      const pcs = this.getUniquePcs(midiNums);
      for (const rootPc of pcs) {
        const fifthPc = (rootPc + 7) % 12;
        const idx = midiNums.findIndex(n => this.midiToPc(n) === fifthPc);
        if (idx !== -1) {
          // on retire la quinte et on relance la reconnaissance
          const reduced = midiNums.slice(0, idx).concat(midiNums.slice(idx + 1));
          const retry = this.recognizeChord(
            reduced,
            options,    // omitFifth reste true mais on bloque la récursion
            true        // missingFifthRecursed = true
          );
          if (retry.length > 0) {
            return retry;
          }
        }
      }
    }

    return ordered;
  }
  

  // Utilitaires pipeline

  // 1. pitch-classes uniques et triées
  getUniquePcs(midiNums) {
    return Array
      .from(new Set(midiNums.map(n => this.midiToPc(n))))
      .sort((a, b) => a - b);
  }

  // 2. ici, tous les pcs sont candidats racines
  findRootCandidates(pcs) {
    return pcs;
  }

  // 3 & 4. calcul des semis bruts et modulo 12 + rootName
  computeSemis(midiNums, rootPc) {
    const rootMidis = midiNums.filter(n => this.midiToPc(n) === rootPc);
    const rootMidi  = Math.min(...rootMidis);
    const semis     = midiNums
      .map(n => n - rootMidi)
      .sort((a, b) => a - b);
    const semisMod  = Array
      .from(new Set(semis.map(iv => ((iv % 12) + 12) % 12)))
      .sort((a, b) => a - b);

    return {
      semis,
      semisMod,
      rootName: this.pcToName(rootPc)
    };
  }

  // 5. matching du squelette triade/tétrade
matchesSkeleton(skelIntervals, semisMod, allowMissingFifth = true) {
  const skelPC = skelIntervals.map(iv => ((iv % 12) + 12) % 12);
  const fifthPC = ((7 % 12) + 12) % 12;

  return skelPC.every(pc => {
    if (allowMissingFifth && pc === fifthPC) return true;
    return semisMod.includes(pc);
  });
}

  // 6. détection de l’extension la plus riche
 detectExtension(chordLabel, semis, semisMod, allowMissingFifth = true) {
  const exts = this.extSignatures[chordLabel] || [];
  for (const ext of exts) {
    const sigPCs = Array
      .from(new Set(ext.intervals.map(iv => ((iv % 12) + 12) % 12)))
      .sort((a, b) => a - b);

    const fifthPC = ((7 % 12) + 12) % 12;
    const filteredSig = allowMissingFifth
      ? sigPCs.filter(pc => pc !== fifthPC)
      : sigPCs;

    const filteredSemis = allowMissingFifth
      ? semisMod.filter(pc => pc !== fifthPC)
      : semisMod;

    if (
      filteredSig.length === filteredSemis.length &&
      filteredSig.every((v, i) => v === filteredSemis[i])
    ) {
      return {
        label:         ext.label,
        usedIntervals: ext.intervals
      };
    }
  }
  return null;
}


  // 7. full-coverage avant slash
  coversAll(usedIntervals, semisMod) {
    const setPC = new Set(
      usedIntervals.map(iv => ((iv % 12) + 12) % 12)
    );
    return semisMod.every(pc => setPC.has(pc));
  }

  // 8. génération du résultat pur et slash
  buildChordResults(midiNums, rootPc, chordLabel, usedIntervals) {
const rootName = this.pcToName(rootPc);
const bassMidi = Math.min(...midiNums);
const bassPc   = this.midiToPc(bassMidi);
const bassName = this.pcToName(bassPc);
const chordType = (chordLabel && rootName) ? chordLabel.slice(rootName.length) : null;
const baseChord = this.chordLibrary.find(c => c.label === chordType || c.chordType === chordType) || null;

const final = {
  label:         chordLabel + (bassPc !== rootPc ? `/${bassName}` : ''),
  chordType:     baseChord ? baseChord.chordType : chordType,
  fullName:      baseChord ? (baseChord.fullName || null) : null,
  altLabel:      baseChord ? (baseChord.altLabel || null) : null,
  intervalsNames: baseChord ? (baseChord.intervalsNames || null) : null,
  intervals:     baseChord ? baseChord.intervals.slice() : usedIntervals.slice(),
  usedIntervals: usedIntervals.slice(),
  root:          rootName,
  basse:         bassName
};



    return [ final ];
  }

  // 9. déduplication par nom
  deduplicate(results) {
    const seen = new Set();
    return results.filter(r => {
      if (seen.has(r.label)) return false;
      seen.add(r.label);
      return true;
    });
  }

  // 10. tri pure vs slash selon priorité
  sortByPriority(results, strict) {
    const pure  = results.filter(r => !r.label.includes('/'));
    const slash = results.filter(r =>  r.label.includes('/'));
    return strict ? [...pure, ...slash] : [...slash, ...pure];
  }

  // 11. option preferSixth
  filterPreferSixth(results) {
    const isSix = r => /\b6(?![0-9])/.test(r.label);
    const sixes = results.filter(isSix);
    const rest  = results.filter(r => !isSix(r));
    return [...sixes, ...rest];
  }

  // utilitaires midi ↔ pc ↔ nom
  midiToPc(m)   { return ((m % 12) + 12) % 12; }
  pcToName(pc)  { return this.noteNames[pc]; }

  // construction de la librairie de base
  buildChordLibrary() {
      return chordLibrary;
  }
}
