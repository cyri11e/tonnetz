let tonnetz;
let midiInput;
let piano;

let lastChordText = '';
let lastChordTime = 0;

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.elt.oncontextmenu = () => false;
  textFont(CONFIG.fontFamily);
  textStyle(CONFIG.fontWeight);
  background(CONFIG.colors.bg);

  tonnetz = new Tonnetz({
    startNote: 'G',
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

  tonnetz.drawGrid(this);
  tonnetz.drawTriangles(this);
  tonnetz.drawEdges(this);
  tonnetz.drawNodes(this);

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

  displayChord(this);
  displayScaleLabel(this);
  displayNoteList(this);
  displayFPS(this);
}

function displayChord(g) {
  const alphaValue = lastChordText
    ? 65 * getFadeFactor(lastChordTime)
    : 0;

  if (alphaValue <= 0 || !lastChordText) return;

  g.push();
  g.textAlign(CENTER, CENTER);
  g.textStyle(BOLD);

  const targetWidth = width * 0.8;
  const baseSize = height / 3;
  let fontSize = baseSize;
  g.textSize(fontSize);
  let tw = g.textWidth(lastChordText);
  if (tw > targetWidth) {
    fontSize *= targetWidth / tw;
    g.textSize(fontSize);
  }

  const c = color(CONFIG.colors.chordDisplay);
  c.setAlpha(alphaValue);

  const outline = color(255);
  outline.setAlpha(30 * (alphaValue / 255));
  g.strokeWeight(fontSize / 16);
  g.stroke(outline);
  g.fill(c);
  g.text(lastChordText, width / 2, height / 2);
  g.noStroke();
  g.text(lastChordText, width / 2, height / 2);
  g.pop();
}

function displayScaleLabel(g) {
  const scaleInfo = tonnetz.gamme.getScaleMode();
  if (!scaleInfo) return;

  const tonicName = tonnetz.gamme.tonicNote;
  const modeName = GAMMES.find(g => g.nom === scaleInfo.nom)?.modes[scaleInfo.mode] ?? `Mode ${scaleInfo.mode}`;
  const scaleText = `${tonicName} ${modeName} (${scaleInfo.nom})`;

  const targetWidth = width * 0.9;
  let fontSize = 50;
  g.textSize(fontSize);
  let tw = g.textWidth(scaleText);
  if (tw > targetWidth) {
    fontSize *= targetWidth / tw;
    g.textSize(fontSize);
  }

  g.push();
  g.stroke(CONFIG.colors.selectedNodeStroke);
  g.noFill();
  g.strokeWeight(0.5);
  g.textAlign(CENTER, TOP);
  g.textStyle(BOLD);
  g.text(scaleText, width / 2, 10);
  g.pop();
}

function displayNoteList(g) {
  const pcs = tonnetz.gamme.pitchClasses;
  const tonicPc = tonnetz.gamme.tonicPc;
  const style = tonnetz.noteStyle;

  const orderedPcs = pcs
    .map(pc => ({ pc, off: mod12(pc - tonicPc) }))
    .sort((a, b) => a.off - b.off)
    .map(({ pc }) => pc);

  const notesText = buildScaleLine(orderedPcs, style);

  g.push();
  g.fill(255);
  g.noStroke();
  g.textAlign(CENTER, TOP);
  g.textStyle(NORMAL);
  g.textSize(20);
  g.text(notesText, width / 2, 70);
  g.pop();
}

function buildScaleLine(pcs, style) {
  if (!pcs || pcs.length === 0) return '';
  let s = pcToName(pcs[0], style);
  for (let i = 0; i < pcs.length; i++) {
    const cur = pcs[i];
    const nxt = pcs[(i + 1) % pcs.length];
    const delta = mod12(nxt - cur);
    const dashes = Math.max(0, delta - 1);
    s += '-'.repeat(dashes) + pcToName(nxt, style);
  }
  return s;
}

function displayFPS(g) {
  g.push();
  g.fill(255);
  g.noStroke();
  g.textAlign(RIGHT, TOP);
  g.textSize(22);
  g.text(`FPS: ${Math.round(frameRate())}`, width - 80, 10);
  g.pop();
}

function mousePressed() {
  const node = tonnetz.findNodeAt(mouseX, mouseY);
  if (!node) return;

  const pc = node.pc;

  if (keyIsDown(SHIFT)) {
    tonnetz.setKey(node.name);
    if (!tonnetz.gamme.chroma.includes(tonnetz.keyPc)) {
      tonnetz.gamme.ajouter(tonnetz.keyPc);
    }
  } else {
    if (pc === tonnetz.keyPc) return;
    if (tonnetz.gamme.pitchClasses.includes(pc)) {
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
    tonnetz.gamme = new Gamme();
    tonnetz.activeMidiNums.forEach(num => {
      const pc = num % 12;
      tonnetz.gamme.ajouter(pc);
    });
    return false;
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
  return false;
}

function mouseDragged() {
  if (mouseButton.right || (mouseButton.left && keyIsDown(SHIFT))) {
    tonnetz.pan(movedX, movedY);
    return false;
  }
}
