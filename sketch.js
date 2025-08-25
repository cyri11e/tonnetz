let tonnetz;
let midiInput;
let piano;

// État pour le fondu logique de l'accord central
let lastChordText = '';
let lastChordTime = 0;

function getFadeFactor(lastTime) {
  const elapsed = millis() - lastTime;
  return 1 - Math.min(elapsed / CONFIG.fadeTime, 1);
}

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
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

  if (tonnetz.zoom == null) tonnetz.zoom = 1;
  if (tonnetz.panX == null) tonnetz.panX = 0;
  if (tonnetz.panY == null) tonnetz.panY = 0;
}

function draw() {
  background(CONFIG.colors.bg);

  push();
  translate(tonnetz.panX, tonnetz.panY);
  scale(tonnetz.zoom);
  tonnetz.drawGrid(this);
  tonnetz.drawTriangles(this);
  tonnetz.drawEdges(this);
  tonnetz.drawNodes(this);
  pop();
  
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

  // Affichage central avec opacité pleine si actif, fondu sinon
  {
    let alphaValue;
    if (chordIsActive) {
      alphaValue = 65; // Pleine opacité
    } else {
      alphaValue = 65 * getFadeFactor(lastChordTime); // Fondu après relâche
    }

    if (alphaValue > 0 && lastChordText) {
      push();
      textAlign(CENTER, CENTER);
      textStyle(BOLD);

      const targetWidth = width * 0.8;
      const baseSize = height / 3;
      let fontSize = baseSize;
      textSize(fontSize);
      let tw = this.textWidth(lastChordText);
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
}

function mousePressed() {
  const node = tonnetz.findNodeAt(mouseX, mouseY);
  if (node) {
    tonnetz.setKey(node.name); // définit la tonique
  }
}


function keyPressed() {
  const pianoSizes = {
    '2': 25,
    '4': 49,
    '6': 61,
    '7': 76,
    '8': 88
  };

  if (pianoSizes[key]) {
    changePianoSize(pianoSizes[key]);
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
  tonnetz.origin = { x: width / 2, y: height / 2 };
}

function mouseWheel(event) {
  const zoomFactor = event.delta > 0 ? 0.95 : 1.05;
  const newZoom = tonnetz.zoom * zoomFactor;
  
  if (newZoom >= 0.5 && newZoom <= 5) {
    const mx = mouseX - tonnetz.panX;
    const my = mouseY - tonnetz.panY;
    tonnetz.panX += mx * (1 - zoomFactor);
    tonnetz.panY += my * (1 - zoomFactor);
    tonnetz.zoom = newZoom;
  }
  
  return false;
}

function mouseDragged() {
  if (mouseButton === RIGHT) {
    tonnetz.panX += movedX;
    tonnetz.panY += movedY;
    return false;
  }
}

function changePianoSize(size) {
  piano = new Piano(size);
}
