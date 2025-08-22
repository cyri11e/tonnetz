class Piano {
  constructor(size = 88) {
    // Définition des différentes tailles de piano
    this.PIANO_SIZES = {
      88: { start: 21, end: 108 },  // A0 à C8  (piano complet)
      76: { start: 28, end: 103 },  // E1 à G7  (piano 76 touches)
      61: { start: 36, end: 96 },   // C2 à C7  (piano 61 touches)
      49: { start: 36, end: 84 },   // C2 à C6  (piano 4 octaves)
      25: { start: 48, end: 72 }    // C3 à C5  (piano 2 octaves)
    };

    const range = this.PIANO_SIZES[size] || this.PIANO_SIZES[88];
    this.startMidi = range.start;
    this.endMidi = range.end;
    
    // Pattern des touches pour un octave (0 = C)
    this.keyPattern = [
      true,  // C  (0)
      false, // C# (1)
      true,  // D  (2)
      false, // D# (3)
      true,  // E  (4)
      true,  // F  (5)
      false, // F# (6)
      true,  // G  (7)
      false, // G# (8)
      true,  // A  (9)
      false, // A# (10)
      true   // B  (11)
    ];

    this.activeKeys = new Set();  // Uniquement les notes MIDI actives
  }

  setMidiNotes(midiNums = []) {
    this.activeKeys = new Set(midiNums);
  }

  draw(g, rootPc = null) {
    g.push();
    
    const margin = 20;
    const y = g.height - margin;
    const totalWidth = g.width - (margin * 2);
    
    // Calculer le nombre de touches blanches pour cette taille de piano
    const numWhiteKeys = Array.from(
      { length: this.endMidi - this.startMidi + 1 },
      (_, i) => this.startMidi + i
    ).filter(midi => this.keyPattern[midi % 12]).length;

    const whiteKeyWidth = totalWidth / numWhiteKeys;
    const whiteKeyHeight = whiteKeyWidth * 4;
    const blackKeyWidth = whiteKeyWidth * 0.6;
    const blackKeyHeight = whiteKeyHeight * 0.6;
    const startX = margin;

    // Touches blanches
    g.strokeWeight(1);
    g.stroke(40);
    let whiteKeyCount = 0;
    
    for (let midi = this.startMidi; midi <= this.endMidi; midi++) {
      const isWhite = this.keyPattern[midi % 12];
      if (isWhite) {
        const x = startX + (whiteKeyWidth * whiteKeyCount);
        const isActive = this.activeKeys.has(midi);
        const isRoot = isActive && rootPc !== null && (midi % 12 === rootPc);
        
        g.fill(isRoot ? CONFIG.colors.rootStroke :
               isActive ? CONFIG.colors.selectedStroke :
               '#ffffff');
        g.rect(x, y - whiteKeyHeight, whiteKeyWidth - 1, whiteKeyHeight);
        whiteKeyCount++;
      }
    }

    // Touches noires
    g.noStroke();
    whiteKeyCount = 0;
    
    for (let midi = this.startMidi; midi <= this.endMidi; midi++) {
      const isWhite = this.keyPattern[midi % 12];
      if (!isWhite) {
        const x = startX + (whiteKeyWidth * (whiteKeyCount - 0.3));
        const isActive = this.activeKeys.has(midi);
        const isRoot = isActive && rootPc !== null && (midi % 12 === rootPc);
        
        g.fill(isRoot ? CONFIG.colors.rootStroke :
               isActive ? CONFIG.colors.selectedStroke :
               '#000000');
        g.rect(x - blackKeyWidth/2, y - whiteKeyHeight, blackKeyWidth, blackKeyHeight);
      } else {
        whiteKeyCount++;
      }
    }
    
    g.pop();
  }
}