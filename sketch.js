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
  
  piano = new Piano(61); // Par exemple, piano 61 touches
}

function draw() {
  background(CONFIG.colors.bg);

  // --- Appliquer pan et zoom ---
  push();
  translate(tonnetz.panX, tonnetz.panY);
  scale(tonnetz.zoom);

  tonnetz.drawGrid(this);
  tonnetz.drawTriangles(this);
  tonnetz.drawEdges(this);
  tonnetz.drawNodes(this);

  pop();

  // --- Récupération des notes actives ---
  const activeNotes = tonnetz.getActiveNotes();
  const chords = activeNotes.length >= 3 ? tonnetz.getDetectedChords() : [];

  let rootNote = null;
  if (chords.length > 0) {
    rootNote = tonnetz.chordDetector.noteToPc[chords[0].root];
  }

  // --- Piano ---
  piano.draw(this, rootNote);

  // --- Affichage accords ---
  if (chords.length > 0) {
    // Petit affichage
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

    // Grand affichage central
    push();
    const chordText = `${chords[0].root}${chords[0].type}`;
    textAlign(CENTER, CENTER);
    textStyle(BOLD);

    const targetWidth = width * 0.8;
    const baseSize = height / 3;
    let fontSize = baseSize;
    textSize(fontSize);
    let tw = textWidth(chordText);
    if (tw > targetWidth) {
      fontSize *= targetWidth / tw;
      textSize(fontSize);
    }

    strokeWeight(fontSize / 16);
    stroke(255, 30);
    fill(CONFIG.colors.chordDisplay);
    text(chordText, width / 2, height / 2);

    noStroke();
    text(chordText, width / 2, height / 2);
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
  // Tailles de piano avec les touches numériques
  const pianoSizes = {
    '2': 25,  // 2 octaves
    '4': 49,  // 4 octaves
    '6': 61,  // 5 octaves + 1
    '7': 76,  // 6 octaves + 4
    '8': 88   // piano complet
  };

  if (pianoSizes[key]) {
    changePianoSize(pianoSizes[key]);
    return;
  }

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

// Ajouter une fonction pour changer la taille du piano
function changePianoSize(size) {
  piano = new Piano(size);
}

