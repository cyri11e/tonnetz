class Piano {
  constructor() {
    this.startMidi = 21;  // A0
    this.endMidi = 108;  // C8
    
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
    
    // Position et dimensions de base
    const margin = 20;
    const y = g.height - margin;
    const totalWidth = g.width - (margin * 2);
    
    // Calculer dimensions des touches
    const numWhiteKeys = 52;
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