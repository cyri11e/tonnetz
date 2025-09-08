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
      'm7♭5': [0, 3, 6, 10],
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

  }

getNoteName(pc) {
  return tonnetz.gamme?.getNoteName?.(pc) ?? pcToName(pc, tonnetz.noteStyle);
}


detect(activeNotes, midiNumbers = null) {


  let pcs, bassNote, midiList;

  // --- 1. Construction de la liste des notes MIDI ---
  if (Array.isArray(midiNumbers) && midiNumbers.length) {
    // Cas où on reçoit directement les numéros MIDI
    midiList = [...new Set(midiNumbers)].sort((a,b) => a - b);
    bassNote = this.getNoteName(midiList[0] % 12); // note la plus grave
    pcs = [...new Set(midiList.map(n => n % 12))].sort((a,b) => a - b); // pitch classes uniques
  } else {
    // Cas où on reçoit des noms de notes (ex: ["C", "E", "G"])
    const map = {};

    // On construit la table de correspondance nom → pitch class
    for (let pc = 0; pc < 12; pc++) {
      // Nom prioritaire : celui donné par la gamme active
      const nameFromGamme = tonnetz.gamme?.getNoteName?.(pc);
      // Fallback : nom brut selon le style (♯/♭/mixte)
      const finalName = nameFromGamme ?? pcToName(pc, tonnetz.noteStyle);
      map[finalName] = pc;
    }

// Conversion des noms reçus en pitch classes
midiList = activeNotes.map(n => map[n]);

// La basse est simplement la première note reçue (déjà au bon format)
bassNote = activeNotes[0];

// Pitch classes uniques triées
pcs = [...new Set(midiList)].sort((a, b) => a - b);

  }

  const results = [];

  // --- 2. Analyse pour chaque note possible comme fondamentale ---
  pcs.forEach(rootPc => {

    // --- Filtrage des fondamentales graves parasites ---
    // Objectif : ignorer les doublons de la fondamentale trop graves
    // qui pourraient être interprétés comme des extensions (#11, 13...)
    const medianNote = midiList[Math.floor(midiList.length / 2)];
    const midiListForAnalysis = midiList.filter(n => {
      const isSamePcAsRoot = (n % 12) === rootPc;
      const tooLow = n < medianNote - 12; // plus d'une octave sous la zone médiane
      return !(isSamePcAsRoot && tooLow);
    });

    // Note MIDI correspondant à la fondamentale choisie
    const rootMidi = midiListForAnalysis.find(n => n % 12 === rootPc);

    // --- Fondamentale virtuelle pour 1er renversement ---
    // Si la basse est la tierce (3 ou 4 demi-tons au-dessus de la fondamentale),
    // on corrige rootPc pour pointer sur la fondamentale "attendue"
    const bassPc = midiList[0] % 12;
    const intervalBassToRoot = (rootPc - bassPc + 12) % 12;
    if (intervalBassToRoot === 3 || intervalBassToRoot === 4) {
      rootPc = (bassPc - intervalBassToRoot + 12) % 12;
    }

    // --- 3. Calcul des intervalles absolus (en demi-tons) ---
    // Par rapport à la fondamentale choisie (rootMidi)
    const intervalsAbs = rootMidi == null
      ? []
      : midiListForAnalysis.map(n => {
          let iv = n - rootMidi;
          while (iv < 0)  iv += 12;  // ramène dans la plage positive
          while (iv > 23) iv -= 12;  // limite à deux octaves
          return iv;
        });

    // --- 4. Calcul des intervalles en pitch class ---
    let intervalsPC = pcs
      .map(pc => (pc - rootPc + 12) % 12)
      .sort((a,b) => a - b);

    // Nettoyage : éviter certaines combinaisons incohérentes
    if (intervalsPC.includes(3) && intervalsPC.includes(4))
      intervalsPC = intervalsPC.filter(iv => iv !== 4);
    if (intervalsPC.includes(4) && intervalsPC.includes(1))
      intervalsPC = intervalsPC.filter(iv => iv !== 1);

    // --- 5. Test de chaque formule d'accord ---
    for (const [name, formula] of Object.entries(this.chordFormulas)) {
      if (!formula.every(iv => intervalsPC.includes(iv))) continue;

      const has7 = intervalsPC.includes(10) || intervalsPC.includes(11);
      if (has7 && (name === '6' || name === 'm6')) continue;

      let chordName = this.getNoteName(rootPc) + name;


      const hasMin3 = intervalsPC.includes(3);
      const hasMaj3 = intervalsPC.includes(4);

      // --- sus → add si tierce présente ---
      if ((name === 'sus2' || name === 'sus4') && (hasMin3 || hasMaj3)) {
        if (name === 'sus2') chordName = this.getNoteName(rootPc) + 'add2';
        if (name === 'sus4') chordName = this.getNoteName(rootPc) + 'add4';
      }

      // --- 6. Extensions ---
      if (intervalsAbs.length) {
        if (!has7) {
          const has2  = intervalsAbs.includes(2);
          const has9  = intervalsAbs.includes(14);
          const has4  = intervalsAbs.includes(5);
          const has11 = intervalsAbs.includes(17);
          const has13 = intervalsAbs.includes(21);

          // Gestion add2/add9 et add4/add11 sans doublons
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
          // Si 7e présente, on "upgrade" vers 9, 11 ou 13
          if      (intervalsAbs.includes(21)) chordName = chordName.replace('7','13');
          else if (intervalsAbs.includes(17)) chordName = chordName.replace('7','11');
          else if (intervalsAbs.includes(14)) chordName = chordName.replace('7','9');
        }
      }

      // --- 7. Altérations ---
      const alts = [];
      if (intervalsAbs.includes(13) && !hasMaj3) alts.push('b9');
      if (intervalsAbs.includes(15) && !hasMin3) alts.push('♯9');
      if (intervalsAbs.includes(18)) alts.push('♯11');
      if (intervalsAbs.includes(20)) alts.push('♭13');
      if (alts.length) chordName += `(${alts.join(',')})`;

      // --- 8. Comptage des notes reconnues ---
      const baseCount = formula.filter(iv => intervalsPC.includes(iv)).length;
      let extIntervals = [14,17,21];
      if (chordName.includes('add2') && !chordName.includes('add9')) extIntervals.push(2);
      if (chordName.includes('add4') && !chordName.includes('add11')) extIntervals.push(5);
      const extCount = extIntervals.filter(iv => intervalsAbs.includes(iv)).length;
      const altCount  = alts.length;
      const recognizedNotes = baseCount + extCount + altCount;
      const totalNotes      = formula.length + extCount + altCount;
      // debug chordName += ` ${recognizedNotes}/${totalNotes}`;

      // --- 9. Signature de l'accord ---
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

      // Ajout au tableau des résultats
      results.push({
        root: this.getNoteName(rootPc),
        type: chordName.replace(this.getNoteName(rootPc), ''),
        bass: bassNote,
        formulaSize: formula.length,
        recognizedNotes,
        totalNotes,
        chordSignature
      });

      // --- LOG DEBUG : affichage accord reconnu ---
      console.log(`✔ Accord reconnu : ${this.getNoteName(rootPc)}${chordName.replace(this.getNoteName(rootPc), '')} [basse: ${bassNote}]`);

    }
  });

  // --- 10. Ajout des slash chords ---
  // Si la basse est différente de la fondamentale, on ajoute "/bass"
  results.forEach(r => {
    if (r.bass !== r.root) {
      r.type = r.type ? `${r.type}/${r.bass}` : `/${r.bass}`;
    }
  });

  // --- 11. Tri des résultats ---
  // Priorité aux accords les plus complets, puis ratio reconnu/total, puis taille de formule
  results.sort((a, b) => {
    if (b.recognizedNotes !== a.recognizedNotes) return b.recognizedNotes - a.recognizedNotes;
    if (b.totalNotes !== a.totalNotes) return b.totalNotes - a.totalNotes;
    const ra = a.recognizedNotes / a.totalNotes;
    const rb = b.recognizedNotes / b.totalNotes;
    if (rb !== ra) return rb - ra;
    return b.formulaSize - a.formulaSize;
  });

  // --- 12. Filtrage des doublons et sous-ensembles ---
  // On élimine les accords qui sont des sous-ensembles d'accords plus riches
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

    if (!isSubset) {
      filtered.push(chord);
    }
  }

  // --- 13. Résultat final ---
  // On retourne uniquement les accords filtrés et triés
  return filtered;
}
}

