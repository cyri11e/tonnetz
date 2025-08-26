let tonnetz;
let midiInput;
let piano;

let lastChordText = '';
let lastChordTime = 0;

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.elt.oncontextmenu = () => false; // bloque menu clic droit
  textFont('Arial Unicode MS');
  textStyle(BOLD);
  background(CONFIG.colors.bg);

  tonnetz = new Tonnetz({
    startNote: 'C',
    H: 9,
    Vn: 7,
    canvas
  });

  midiInput = new MidiInput((notes, midiNums) => {
    tonnetz.setMidiNotes(notes, midiNums);
    piano.setMidiNotes(midiNums);
  });
  midiInput.init();

  piano = new Piano(61);
}

function draw() {
  background(CONFIG.colors.bg);

  // Dessin direct (px/py déjà calculés)
  tonnetz.drawGrid(this);
  tonnetz.drawTriangles(this);
  tonnetz.drawEdges(this);
  tonnetz.drawNodes(this);

  // Détection accords
  const activeNotes = tonnetz.getActiveNotes();
  const chords = activeNotes.length >= 3 ? tonnetz.getDetectedChords() : [];
  const chordIsActive = chords.length > 0;

  if (chordIsActive) {
    const chord = chords[0];
    lastChordText = `${chord.root}${chord.type}`;
    lastChordTime = millis();
  }

  let rootNote = null;
  if (chords.length > 0) {
    rootNote = tonnetz.chordDetector.noteToPc[chords[0].root];
  }

  piano.draw(this, rootNote);

  // Liste accords détectés
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

  // Affichage central avec fondu
  let alphaValue = chordIsActive
    ? 65
    : 65 * getFadeFactor(lastChordTime);

  if (alphaValue > 0 && lastChordText) {
    push();
    textAlign(CENTER, CENTER);
    textStyle(BOLD);

    const targetWidth = width * 0.8;
    const baseSize = height / 3;
    let fontSize = baseSize;
    textSize(fontSize);
    let tw = textWidth(lastChordText);
    if (tw > targetWidth) {
      fontSize *= targetWidth / tw;
      textSize(fontSize);
    }

    const c = color(CONFIG.colors.chordDisplay);
    c.setAlpha(alphaValue);

    strokeWeight(fontSize / 16);
    const outline = color(255);
    outline.setAlpha(30 * (alphaValue / 255));
    stroke(outline);

    fill(c);
    text(lastChordText, width / 2, height / 2);

    noStroke();
    fill(c);
    text(lastChordText, width / 2, height / 2);
    pop();
  }
}

function mousePressed() {
  const node = tonnetz.findNodeAt(mouseX, mouseY);
  if (node) {
    tonnetz.setKey(node.name);
  }
}

function keyPressed() {
  const pianoSizes = { '2': 25, '4': 49, '6': 61, '7': 76, '8': 88 };
  if (pianoSizes[key]) {
    piano = new Piano(pianoSizes[key]);
    return;
  }

  if (key === 'Tab') {
    const styles = ['sharp', 'flat', 'mixed'];
    const currentIndex = styles.indexOf(tonnetz.noteStyle);
    const nextStyle = styles[(currentIndex + 1) % styles.length];
    tonnetz.setNoteStyle(nextStyle);
    return false;
  }

  const pc = keyToPc(key);
  if (pc !== null) {
    tonnetz.togglePc(pc);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  tonnetz.resize(width, height);
}

function mouseWheel(event) {
  const factor = event.delta > 0 ? 0.95 : 1.05;
  tonnetz.zoomAt(mouseX, mouseY, factor);
  console.log(`Zoom actuel : ${tonnetz.zoom.toFixed(2)}`);
  return false;
}

function mouseDragged() {
  console.log(
    `mouseDragged → left:${mouseButton.left}, right:${mouseButton.right}, center:${mouseButton.center}, movedX:${movedX}, movedY:${movedY}`
  );

  if (mouseButton.right || (mouseButton.left && keyIsDown(SHIFT))) {
    tonnetz.pan(movedX, movedY);
    return false;
  }
}


