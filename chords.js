// chords.js
// ====================
// 🎵 Détection d'accords avancée (ES6, style cohérent)
// ====================

class ChordDetector {
  constructor() {
    this.chordFormulas = {
      '': [0, 4, 7],        // accord majeur (sans suffixe)
      'm': [0, 3, 7],       // mineur
      'dim': [0, 3, 6],
      'aug': [0, 4, 8],
      'sus2': [0, 2, 7],
      'sus4': [0, 5, 7],
      '7': [0, 4, 7, 10],
      'm7': [0, 3, 7, 10],
      'maj7': [0, 4, 7, 11],
      'dim7': [0, 3, 6, 9],
      'm7b5': [0, 3, 6, 10],
      '6': [0, 4, 7, 9],
      'm6': [0, 3, 7, 9],
      '9': [0, 4, 7, 10, 14],
      'm9': [0, 3, 7, 10, 14],
      'maj9': [0, 4, 7, 11, 14]
    };

    this.noteToPc = {
      'C':0, 'C#':1, 'Db':1, 'D':2, 'D#':3, 'Eb':3,
      'E':4, 'F':5, 'F#':6, 'Gb':6, 'G':7, 'G#':8, 'Ab':8,
      'A':9, 'A#':10, 'Bb':10, 'B':11
    };

    this.pcToNote = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  }

  detect(activeNotes) {
    const pcs = [...new Set(activeNotes.map(n => this.noteToPc[n]))].sort((a,b) => a-b);
    const results = [];

    pcs.forEach(rootPc => {
      const intervals = pcs.map(pc => (pc - rootPc + 12) % 12).sort((a,b) => a-b);

      for (const [name, formula] of Object.entries(this.chordFormulas)) {
        if (formula.length === intervals.length && 
            formula.every(iv => intervals.includes(iv))) {
          results.push({
            root: this.pcToNote[rootPc],
            type: name,
            notes: pcs.map(pc => this.pcToNote[pc]),
            bass: this.pcToNote[pcs[0]]
          });
        }
      }
    });

    // Slash chords uniquement si basse ≠ fondamentale
    //results.forEach(r => {
    //  if (r.bass !== r.root) {
    //    r.type += `/${r.bass}`;
    //  }
    //});

    // Supprimer doublons
    return results.filter((r, idx, arr) =>
      idx === arr.findIndex(o => o.root === r.root && o.type === r.type)
    );
  }
}

// On rend la classe accessible globalement pour P5.js
window.ChordDetector = ChordDetector;

