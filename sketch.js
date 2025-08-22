let tonnetz;
let midiInput;
let piano;

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  textFont('Arial');  // Police globale plus lisible
  textStyle(BOLD);
  background(CONFIG.colors.bg);

  tonnetz = new Tonnetz({
    startNote: 'C',
    H: 9,
    Vn: 7,
    canvas
  });

  // Initialisation MIDI
  midiInput = new MidiInput((notes, midiNums) => {
    tonnetz.setMidiNotes(notes, midiNums);
    piano.setMidiNotes(midiNums);  // Transmission au piano
  });
  midiInput.init();
  
  piano = new Piano();
}

function draw() {
  background(CONFIG.colors.bg);
  tonnetz.drawGrid(this);
  tonnetz.drawTriangles(this);
  tonnetz.drawEdges(this);
  tonnetz.drawNodes(this);
  
  // Récupération des notes actives et de la fondamentale pour le piano et les accords
  const activeNotes = tonnetz.getActiveNotes();
  const activePCs = activeNotes.map(note => tonnetz.chordDetector.noteToPc[note]);
  let rootPc = null;
  const chords = activeNotes.length >= 3 ? tonnetz.getDetectedChords() : [];
  
  if (chords.length > 0) {
    rootPc = tonnetz.chordDetector.noteToPc[chords[0].root];
  }
  
  // Récupération de la tonique pour le piano si un accord est détecté
  let rootNote = null;
  if (chords.length > 0) {
    rootNote = tonnetz.chordDetector.noteToPc[chords[0].root];
  }
  
  // Affichage du piano (uniquement les notes MIDI)
  piano.draw(this, rootNote);
  
  // Affichage des accords
  if (chords.length > 0) {
    // Petit affichage en haut à gauche
    push();
    fill(255);
    noStroke();
    textAlign(LEFT, TOP);
    textSize(16);
    text('Accords détectés:', 10, 10);
    chords.forEach((chord, i) => {
      text(`${chord.root}${chord.type}`, 10, 35 + i * 25);
    });
    pop();

    // Grand affichage central adaptatif
    push();
    const chord = chords[0];
    const chordText = `${chord.root}${chord.type}`;
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    
    // Calcul taille adaptative
    const targetWidth = width * 0.8;  // 80% de la largeur
    const baseSize = height/3;
    let fontSize = baseSize;
    textSize(fontSize);
    let textWidth = this.textWidth(chordText);
    
    // Réduire la taille si nécessaire
    if (textWidth > targetWidth) {
      fontSize *= targetWidth / textWidth;
      textSize(fontSize);
    }

    // Contour blanc pour lisibilité
    strokeWeight(fontSize/16);
    stroke(255, 30);  // Contour blanc semi-transparent
    fill(CONFIG.colors.chordDisplay);
    text(chordText, width/2, height/2);
    
    // Texte principal
    noStroke();
    text(chordText, width/2, height/2);
    pop();
  }
}

function mousePressed() {
  const node = tonnetz.findNodeAt(mouseX, mouseY);
  if (node) {
    node.manualSelected = !node.manualSelected;
  }
}

function keyPressed() {
  if (key === 'Tab') {
    // Cycle entre les styles de notes
    const styles = ['sharp', 'flat', 'mixed'];
    const currentIndex = styles.indexOf(tonnetz.noteStyle);
    const nextStyle = styles[(currentIndex + 1) % styles.length];
    tonnetz.setNoteStyle(nextStyle);
    return false; // Empêche le comportement par défaut
  }

  const pc = keyToPc(key);
  if (pc !== null) {
    tonnetz.togglePc(pc);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  tonnetz.origin = { x: width / 2, y: height / 2 };
}

function mouseWheel(event) {
  // Zoom centré sur la position de la souris
  const zoomFactor = event.delta > 0 ? 0.95 : 1.05;
  const newZoom = tonnetz.zoom * zoomFactor;
  
  // Limite le zoom entre 0.5 et 5
  if (newZoom >= 0.5 && newZoom <= 5) {
    // Calcul du décalage pour centrer le zoom sur la souris
    const mx = mouseX - tonnetz.panX;
    const my = mouseY - tonnetz.panY;
    tonnetz.panX += mx * (1 - zoomFactor);
    tonnetz.panY += my * (1 - zoomFactor);
    tonnetz.zoom = newZoom;
  }
  
  return false; // Empêche le scroll de la page
}

function mouseDragged() {
  // Pan avec le clic droit
  if (mouseButton === RIGHT) {
    tonnetz.panX += movedX;
    tonnetz.panY += movedY;
    return false;
  }
}

