let tonnetz;
let midiInput;

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
    tonnetz.selectedPcs.clear();
    notes.forEach(note => {
      tonnetz.selectedPcs.add(nameToPc(note));
    });
  });
  midiInput.init();
}

function draw() {
  background(CONFIG.colors.bg);
  tonnetz.drawGrid(this);
  tonnetz.drawTriangles(this);
  tonnetz.drawEdges(this);
  tonnetz.drawNodes(this);
  
  // Affichage des accords détectés
  const chords = tonnetz.getDetectedChords();
  if (chords.length > 0) {
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
  }
}

function mousePressed() {
  const node = tonnetz.findNodeAt(mouseX, mouseY);
  if (node) {
    node.manualSelected = !node.manualSelected;
  }
}

function keyPressed() {
  const pc = keyToPc(key);
  if (pc !== null) {
    tonnetz.togglePc(pc);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  tonnetz.origin = { x: width / 2, y: height / 2 };
}
