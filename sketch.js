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

  const scaleInfo = tonnetz.gamme.getScaleMode(); // { nom: "Majeure", mode: 5 } ou null
  const tonicName = tonnetz.keyNote;              // ex: "A", "F#", etc.

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
  if (scaleInfo) {
  push();
  stroke(CONFIG.colors.selectedNodeStroke);
  noFill();
  strokeWeight(0.5);
  textAlign(CENTER, TOP);
  textStyle(BOLD);
  textSize(50);

  const modeName = GAMMES.find(g => g.nom === scaleInfo.nom)?.modes[scaleInfo.mode] ?? `Mode ${scaleInfo.mode}`;
  const scaleText = `${tonicName} ${modeName} (${scaleInfo.nom})`;

  text(scaleText, width / 2, 10); // Position haute centrale
  pop();
}

}

function mousePressed() {
  const node = tonnetz.findNodeAt(mouseX, mouseY);
  if (!node) return;

  const pc = node.pc;

  if (keyIsDown(SHIFT)) {
    // Shift + clic → changer la tonique
    tonnetz.setKey(node.name);

    // 🔒 Ajout automatique de la tonique si absente
    if (!tonnetz.gamme.chroma.includes(tonnetz.keyPc)) {
      tonnetz.gamme.ajouter(tonnetz.keyPc);
    }

  } else {
    // 🚫 Empêcher de retirer la tonique active
    if (pc === tonnetz.keyPc) {
      console.log("Impossible de retirer la tonique actuelle. Choisissez-en une autre avant.");
      return;
    }

    // Clic simple → toggle dans la gamme
    if (tonnetz.gamme.chroma.includes(pc)) {
      tonnetz.gamme.supprimer(pc);
    } else {
      tonnetz.gamme.ajouter(pc);
    }
  }
}



function keyPressed() {
  const pianoSizes = { '2': 25, '4': 49, '6': 61, '7': 76, '8': 88 };
  if (pianoSizes[key]) {
    piano = new Piano(pianoSizes[key]);
    return;
  }



if (key === ' ') {
  console.log('Space pressed');
  // Barre espace → remplacer la gamme par les notes jouées
  tonnetz.gamme = new Gamme(); // Réinitialise la gamme
  tonnetz.activeMidiNums.forEach(num => {
    const pc = num % 12;
    tonnetz.gamme.ajouter(pc);
  });
  return false; // Empêche le scroll de la page
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


