// scale.js
// objet Gamme avec pour donnee de reference une signature type binaire representant la presence de note parmi 12
// par defaut commence avec une gamme vide
// possibilite d ajouter supprimer et deplacer des notes
// a chaque modification et verifie si gamme mode connu


class Gamme {
  constructor(init = "100000000000", tonicNote = "C") {
    this.signature = init;
    this.tonicNote = tonicNote;
    this.tonicPc = nameToPc(tonicNote);
    this.nomReconnu = null;
    this.modeReconnu = null;
    this.degres = [];
    this.notes = [];
    this.updateChroma();
    this.updatePitchClasses();
    this.updateDegres();
    this.reconnaitre();
  }

  setSignature(sig) {
    if (/^[01]{12}$/.test(sig)) {
      this.signature = sig;
      this.updateChroma();
      this.updateDegres();
      this.reconnaitre();
    } else {
      console.error("Signature invalide. Doit être une chaîne binaire de 12 caractères.");
    }
  }

  setTonic(note) {
    if (note === this.tonicNote) return; // pas de changement
    this.tonicNote = note;
    this.tonicPc = nameToPc(note);
    this.updateSignatureFromTonic();
    this.reconnaitre();
    this.updateChroma();
    this.updateDegres();
    this.updateIntervalles();
  }

  updateSignatureFromTonic() {
    this.signature = "000000000000".split("");
    this.chroma.forEach(pc => {
      const index = (pc - this.tonicPc + 12) % 12;
      this.signature[index] = '1';
    });
    this.signature = this.signature.join("");
  }


  updatePitchClasses() {
    if (typeof this.tonicPc !== 'number') {
      this.tonicPc = nameToPc(this.tonicNote);
    }

    this.pitchClasses = [];
    for (let i = 0; i < 12; i++) {
      if (this.signature[i] === '1') {
        this.pitchClasses.push(mod12(i + this.tonicPc));
      }
    }
  }

  updateChroma() {
    console.log("Updating chroma from signature:", this.chroma);
    this.chroma = [];
    for (let i = 0; i < 12; i++) {
      if (this.signature[i] === '1') this.chroma.push(i);
    }
    console.log("Updated chroma:", this.chroma);
  }

  updateDegres() {
    const MAJEURE = [0, 2, 4, 5, 7, 9, 11];
    const labels  = ["1", "2", "3", "4", "5", "6", "7"];

    if (this.chroma.length !== 7) {
      // Pour les gammes non diatoniques on pioche en dur
      // un degre peut apparaitre plusieurs fois
      this.degres = this.chroma.map(c => 
        ["1", "b2", "2", "b3", "3", "4", "b5", "5", "b6", "6", "b7", "7"][c]
      );
    } else {
      // Pour une gamme de 7 notes, 7 degres uniques
      this.degres = this.chroma.map((ch, i) =>
        getAlteration(ch, MAJEURE[i]) + labels[i]
      );
    }
    const tonique = this.degres[0];

    this.intervalles = this.degres.map(degre =>
      calculerIntervalle(tonique, degre)
    );
    this.updateNoteLabels();
  }

  getDegres() {
    return this.degres;
  }

  updateIntervalles() {
    const MAJEURE = [0, 2, 4, 5, 7, 9, 11];
    const base    = ["P1", "M2", "M3", "P4", "P5", "M6", "M7"];

    if (this.chroma.length === 7) {
      this.intervalles = this.chroma.map((ch, i) => {
        const refKey = base[i];
        const ref = INTERVALLES[refKey];
        const nat = getIntervalNature(ref.chroma, ch, ref.nature);
        const number = i + 1;
        return `${nat}${number}`; // ex: m3, A4, d5
      });
    } else {
      const fallback = ["P1", "m2", "M2", "m3", "M3", "P4", "d5", "P5", "m6", "M6", "m7", "M7"];
      this.intervalles = this.chroma.map(c => fallback[c] || "?");
    }
  }



  ajouter(index) {
    console.log("Adding note at index:", index);
    if (this.signature[index] === '0') {
      this.signature = this.signature.slice(0, index) + '1' + this.signature.slice(index + 1);
      this.updateChroma();
      this.updateDegres();
      this.updatePitchClasses();
      this.reconnaitre();
    }
  }

  supprimer(index) {
    console.log("Removing note at index:", index);
    if (this.signature[index] === '1') {
      this.signature = this.signature.slice(0, index) + '0' + this.signature.slice(index + 1);
      this.updateChroma();
      this.updateDegres();
      this.updatePitchClasses();
      this.reconnaitre();
    }
  }

  deplacer(from, to) {
    if (
      this.signature[from] === '1' &&
      this.signature[to] === '0' &&
      Math.abs(from - to) === 1
    ) {
      let arr = this.signature.split("");
      arr[from] = '0';
      arr[to] = '1';
      this.signature = arr.join("");
      this.updateChroma();
      this.updateDegres();
      this.reconnaitre();
      
    }
  }

  reconnaitre() {
    this.nomReconnu = null;
    this.modeReconnu = null;
    // retourne -1 si pas trouve
    for (let g of GAMMES) {
      let str = g.signature;
      let rotation = 0;
      for (let i = 0; i < 12; i++) {
        if (str.startsWith("1") && str === this.signature) {
          this.nomReconnu = g.nom;
          this.modeReconnu = rotation;
          this.updateNoteLabels();

          return;
        }
        str = str.slice(1) + str[0];
        if (str.startsWith("1")) rotation++;
      }
    }
    return -1;
  }

  getLabel(i) {
    const pos = this.chroma.indexOf(i);
    return pos !== -1 ? this.degres[pos] : "♪";
  }

  getInterval(i) {
    const pos = this.chroma.indexOf(i);
    const fallback = ["P1", "m2", "M2", "m3", "M3", "P4", "d5", "P5", "m6", "M6", "m7", "M7"];
    // Si l'index n'est pas trouvé, retourne un intervalle par défaut

    return pos !== -1 ? this.intervalles[pos] : fallback[i] || "?";
  }

updateNoteLabels() {
  if (this.nomReconnu == null) return;

  if (this.chroma.length !== 7) {
    // fallback : pas de logique de lettres, juste mapping simple
    this.notes = this.pitchClasses.map(pc => pcToName(pc));
    return;
  }

  // logique diatonique inchangée
  const labels = [];
  let currentLabel = this.tonicNote;
  for (let i = 0; i < this.chroma.length; i++) {
    labels.push(currentLabel);
    currentLabel = getNextNoteLabel(
      currentLabel,
      (this.chroma[(i + 1) % this.chroma.length] - this.chroma[i] + 12) % 12
    );
  }
  this.notes = labels;
}


  getScaleMode() {
    return this.nomReconnu ? { nom: this.nomReconnu, mode: this.modeReconnu } : null;
  }

  toString() {
    return this.nomReconnu
      ? `Gamme reconnue : ${this.nomReconnu} (mode ${this.modeReconnu})`
      : `Gamme non reconnue : ${this.signature}`;
  }
}
