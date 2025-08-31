// =========================
// scale.js
// =========================
// Classe Gamme : représente un ensemble de notes défini par une signature binaire (12 bits)
// et une tonique. Calcule automatiquement : chromas, pitch classes, degrés, intervalles,
// noms des notes et reconnaissance de la gamme/mode.
//
// Règles métier :
//   - La tonique est toujours présente (degré 1).
//   - La gamme ne peut pas être vide.
//   - Modifier la gamme (ajout, suppression, déplacement) déclenche un recalcul complet.
// =========================

class Gamme {

  // -------------------------
  // Constructeur
  // -------------------------
  constructor( tonicNote = "C", init = "100000000000") {
    this.signature = init;                      // Signature binaire de 12 caractères
    this.tonicNote = tonicNote;                 // Nom de la tonique (ex: 'C', 'D#')
    this.tonicPc = nameToPc(tonicNote);          // Pitch class absolu de la tonique
    this.nomReconnu = null;                      // Nom de gamme si reconnue
    this.modeReconnu = null;                     // Numéro de mode si reconnu
    this.degres = [];                            // Degrés relatifs (1, b3...)
    this.notes = [];                             // Noms complets des notes

    // Initialise toutes les structures dérivées
    this.refreshAll();
  }

  // -------------------------
  // Pipeline unique de recalcul
  // -------------------------
  refreshAll() {
    // Met à jour tout ce qui dépend de la signature/tonique
    this.updateChroma();
    this.updatePitchClasses();
    this.updateDegres();
    this.updateIntervalles();
    this.reconnaitre();
    this.updateNoteLabels();
  }

  // -------------------------
  // Modification brute de signature
  // -------------------------
  setSignature(sig) {
    // Vérifie que sig = chaîne binaire 12 bits
    if (/^[01]{12}$/.test(sig)) {
      this.signature = sig;
      this.refreshAll();
    } else {
      console.error("Signature invalide. Doit être une chaîne binaire de 12 caractères.");
    }
  }

  // -------------------------
  // Changement de tonique
  // -------------------------
setTonic(note) {
  const newPc = nameToPc(note);
  if (newPc === this.tonicPc) return;

  // Exige que la nouvelle tonique appartienne à l’ensemble courant
  if (!this.pitchClasses || !this.pitchClasses.includes(newPc)) {
    console.warn(
      `Tonique "${note}" hors de la gamme actuelle. ` +
      `Utilise transposeTo("${note}") si tu veux changer de tonalité.`
    );
    return;
  }

  this.tonicNote = note;
  this.tonicPc = newPc;

  // Reconstruit la signature relative à partir de l’ensemble ABSOLU (inchangé)
  const sigArr = Array(12).fill('0');
  this.pitchClasses.forEach(pcAbs => {
    sigArr[(pcAbs - this.tonicPc + 12) % 12] = '1';
  });
  this.signature = sigArr.join('');

  // Relance le pipeline (même flow qu’à l’init)
  this.updateChroma();
  this.updatePitchClasses(); // doit redonner EXACTEMENT le même ensemble
  this.updateDegres();
  this.updateIntervalles();
  this.reconnaitre();
  this.updateNoteLabels();
}






  // -------------------------
  // Recalcule signature relative depuis tonique
  // -------------------------
  updateSignatureFromTonic() {
    // Reconstruit la signature où index 0 = tonique
    this.signature = "000000000000".split("");
    this.chroma.forEach(pc => {
      const index = (pc - this.tonicPc + 12) % 12;
      this.signature[index] = '1';
    });
    this.signature = this.signature.join("");
  }

  // -------------------------
  // Chroma relatif : offsets en demi-tons depuis la tonique
  // -------------------------
  updateChroma() {
    this.chroma = [];
    for (let i = 0; i < 12; i++) {
      if (this.signature[i] === '1') this.chroma.push(i);
    }
  }

  // -------------------------
  // Pitch classes absolus
  // -------------------------
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

  // -------------------------
  // Degrés relatifs (1, 2, b3...) et intervalles relatifs à la tonique
  // -------------------------
  updateDegres() {
    const MAJEURE = [0, 2, 4, 5, 7, 9, 11];
    const labels  = ["1", "2", "3", "4", "5", "6", "7"];

    if (this.chroma.length !== 7) {
      // Gamme non diatonique
      this.degres = this.chroma.map(c =>
        ["1", "b2", "2", "b3", "3", "4", "b5", "5", "b6", "6", "b7", "7"][c]
      );
    } else {
      // Gamme diatonique : comparaison à la majeure
      this.degres = this.chroma.map((ch, i) =>
        getAlteration(ch, MAJEURE[i]) + labels[i]
      );
    }

    const tonique = this.degres[0];
    this.intervalles = this.degres.map(degre =>
      calculerIntervalle(tonique, degre)
    );
  }

  // -------------------------
  // Intervalles (P1, m3...) selon diatonique ou fallback
  // -------------------------
  updateIntervalles() {
    const MAJEURE = [0, 2, 4, 5, 7, 9, 11];
    const base    = ["P1", "M2", "M3", "P4", "P5", "M6", "M7"];

    if (this.chroma.length === 7) {
      this.intervalles = this.chroma.map((ch, i) => {
        const refKey = base[i];
        const ref = INTERVALLES[refKey];
        const nat = getIntervalNature(ref.chroma, ch, ref.nature);
        const number = i + 1;
        return `${nat}${number}`;
      });
    } else {
      const fallback = ["P1", "m2", "M2", "m3", "M3", "P4", "d5", "P5", "m6", "M6", "m7", "M7"];
      this.intervalles = this.chroma.map(c => fallback[c] || "?");
    }
  }

  // -------------------------
  // Modification : ajout de note
  // -------------------------
  ajouter(pc) {
    console.log("Gamme.ajouter(",pc,")");
    const index = mod12(pc - this.tonicPc  ); // convertit en relatif
    console.log(`✅ Ajouté pc=${index} → pitchClasses:`,index);
    if (this.signature[index] === '0') {
      this.signature =
        this.signature.slice(0, index) + '1' + this.signature.slice(index + 1);
      this.refreshAll();
    }
  }

  // -------------------------
  // Modification : suppression de note (protège tonique)
  // -------------------------
  supprimer(pc) {
    console.log("Gamme.supprimer(",pc,")");
    const index = mod12(pc - this.tonicPc); // convertit en relatif
    console.log(`✅ Supprimé pc=${index} → pitchClasses:`,index);
    if (pc === this.tonicPc) return; // Tonique intouchable
    if (this.signature[index] === '1') {
      this.signature =
        this.signature.slice(0, index) + '0' + this.signature.slice(index + 1);
      this.refreshAll();
    }
  }

  // -------------------------
  // Modification : déplacement d’une note (protège tonique)
  // -------------------------
  deplacer(from, to) {
    if (from === this.tonicPc) return; // Tonique intouchable
    if (
      this.signature[from] === '1' &&
      this.signature[to] === '0' &&
      Math.abs(from - to) === 1
    ) {
      let arr = this.signature.split("");
      arr[from] = '0';
      arr[to] = '1';
      this.signature = arr.join("");
      this.refreshAll();
    }
  }

  // -------------------------
  // Reconnaissance de la gamme et du mode
  // -------------------------
  reconnaitre() {
    this.nomReconnu = null;
    this.modeReconnu = null;
    for (let g of GAMMES) {
      let str = g.signature;
      let rotation = 0;
      for (let i = 0; i < 12; i++) {
        if (str.startsWith("1") && str === this.signature) {
          this.nomReconnu = g.nom;
          this.modeReconnu = rotation;
          return;
        }
        str = str.slice(1) + str[0];
        if (str.startsWith("1")) rotation++;
      }
    }
    return -1;
  }

  // -------------------------
  // Degré pour un chroma relatif
  // -------------------------
  getLabel(i) {
    const pos = this.chroma.indexOf(i);
    return pos !== -1 ? this.degres[pos] : "♪";
  }
  // -------------------------
  // Nom de note pour un pitch class absolu
  // -------------------------
  getNoteName(pc) {
    const index = this.pitchClasses.indexOf(pc);
    if (index === -1) return null;
    return this.notes[index];
  }

  // -------------------------
  // Intervalle pour un chroma relatif
  // -------------------------
  getInterval(i) {
    // Retourne l’intervalle (type et numéro) correspondant
    // à un degré identifié par un chroma relatif i (0 à 11).

    const pos = this.chroma.indexOf(i);
    // Tableau de secours pour gammes non diatoniques ou index absent
    const fallback = [
      "P1", "m2", "M2", "m3", "M3", "P4", "d5",
      "P5", "m6", "M6", "m7", "M7"
    ];

    // Si i correspond à un degré de la gamme → intervalle calculé
    // Sinon → valeur issue du fallback ou "?" si non trouvé
    return pos !== -1 ? this.intervalles[pos] : fallback[i] || "?";
  }

updateNoteLabels() {
  const labels = [];

  if (this.nomReconnu) {
    // Cas gamme reconnue : on applique la logique stricte
    let currentLabel = this.tonicNote;
    for (let i = 0; i < this.chroma.length; i++) {
      labels.push(currentLabel);
      const demiTons = (this.chroma[(i + 1) % this.chroma.length] - this.chroma[i] + 12) % 12;
      currentLabel = getNextNoteLabel(currentLabel, demiTons);
    }
  } else {
    // Cas non reconnu : noms par défaut depuis pitchClasses
    this.pitchClasses.forEach(pc => {
      labels.push(pcToName(pc));
    });
  }

  this.notes = labels;
}


  getScaleMode() {
    // Renvoie les infos de gamme si reconnue,
    // sinon null
    return this.nomReconnu
      ? { nom: this.nomReconnu, mode: this.modeReconnu }
      : null;
  }

  toString() {
    // Fournit une représentation lisible
    // Exemple : "Gamme reconnue : Majeure (mode 0)"
    // ou "Gamme non reconnue : 101011010101"
    return this.nomReconnu
      ? `Gamme reconnue : ${this.nomReconnu} (mode ${this.modeReconnu})`
      : `Gamme non reconnue : ${this.signature}`;
  }

  transpose(offset) {
    this.tonicPc = mod12(this.tonicPc + offset);
    this.tonicNote = pcToName(this.tonicPc);
    this.pitchClasses = this.pitchClasses.map(pc => mod12(pc + offset));
    this.refreshAll();
  }

}
