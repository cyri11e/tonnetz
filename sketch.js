let tonnetz;
let midiInput;
let piano;

let lastChordText = '';
let lastChordTime = 0;
let noteListView;

let draggedNode = null;
let draggedBubble = null;
let dragStartPc = null;



function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.elt.oncontextmenu = () => false;
  textFont(CONFIG.fontFamily);
  textStyle(CONFIG.fontWeight);
  background(CONFIG.colors.bg);

  tonnetz = new Tonnetz({
    startNote: 'G',
    H: 6,
    Vn: 6,
    canvas
  });

  midiInput = new MidiInput((notes, midiNums) => {
    tonnetz.updateFromMidi(midiNums);
    piano.setMidiNotes(midiNums);
  });
  midiInput.init();

  noteListView = new NoteListView({
    gamme: tonnetz.gamme,
    tonicPc: tonnetz.keyPc,
    style: tonnetz.noteStyle
  });


  piano = new Piano(61);
}

function draw() {
  background(CONFIG.colors.bg);

  tonnetz.draw(this);

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

  noteListView.update(tonnetz.gamme, tonnetz.keyPc);
  noteListView.draw(this, width, tonnetz.zoom);
  displayScaleLabel(this);
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
  g.textSize(12);
  g.text(`FPS: ${Math.round(frameRate())}`, width - 80, 10);
  g.textAlign(LEFT, TOP);
  g.text(`Zoom: ${Math.round(tonnetz.zoom * 100)}%`, 10, 10);
  g.pop();
}

function displayScaleLabel(g) {
  const gamme = tonnetz.gamme;
  const scaleInfo = gamme?.getScaleMode();

  const tonicName = gamme?.tonicNote ?? '—';
  let scaleText;

  if (scaleInfo && scaleInfo.nom) {
    const modeName = GAMMES.find(g => g.nom === scaleInfo.nom)?.modes[scaleInfo.mode] ?? `Mode ${scaleInfo.mode}`;
    scaleText = `${tonicName} ${modeName} (${scaleInfo.nom})`;
  } else {
    scaleText = `${tonicName} Gamme inconnue`;
  }

  const targetWidth = width * 0.9;
  let fontSize = CONFIG.fontSize * 2;
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

function mouseReleased() {
  if (draggedBubble) {
    for (const target of noteListView.bubbles) {
      const dx = mouseX - target.x;
      const dy = mouseY - target.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= target.radius + 2 && target.pc !== dragStartPc) {
        const fromPc = dragStartPc;
        const toPc = target.pc;

        if (tonnetz.gamme.pitchClasses.includes(fromPc)) {
          tonnetz.gamme.supprimer(fromPc);
        }
        if (!tonnetz.gamme.pitchClasses.includes(toPc)) {
          tonnetz.gamme.ajouter(toPc);
        }
        break;
      }
    }
    draggedBubble = null;
    dragStartPc = null;
  }
}



function mousePressed() {
  if (noteListView && noteListView.handleClick(mouseX, mouseY)) return;

  const node = tonnetz.findNodeAt(mouseX, mouseY);
  if (!node) return;
  handleTonnetzClick(node);
}

function handleTonnetzClick(node) {
  const pc = node.pc;

  if (keyIsDown(SHIFT)) {
    tonnetz.setKey(node.name);
    if (!tonnetz.gamme.chroma.includes(tonnetz.keyPc)) {
      tonnetz.gamme.ajouter(tonnetz.keyPc);
    }
  } else {
    tonnetz.togglePc(pc);
  }
}


function keyPressed() {
  const pianoSizes = { '2': 25, '4': 49, '6': 61, '7': 76, '8': 88 };
  if (pianoSizes[key]) {
    piano = new Piano(pianoSizes[key]);
    return;
  }

  if (key === BACKSPACE) {
    tonnetz.gamme = new Gamme('C'); // ← recrée la gamme
    tonnetz.setKey('C');            // ← synchronise la tonique
    tonnetz.selectedPcs.clear();
    tonnetz.activePcs.clear();
    console.log('🔄 Gamme recréée sur C');
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
    tonnetz.toggleActivePc(pc);
  }

  if (key === '+' || key === '=') {
    tonnetz.transposeGamme(+1); // monte d’un demi-ton
    return false;
  }
  if (key === '-') {
    tonnetz.transposeGamme(-1); // descend d’un demi-ton
    return false;
  }
  if (key === 'm') {
    tonnetz.rotateMode();
    return false;
  }
  if (key === 'r') {
    tonnetz.relativeTranspose();
    return false;
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
  // pan du Tonnetz
  if (mouseButton.right || (mouseButton.left && keyIsDown(SHIFT))) {
    tonnetz.pan(movedX, movedY);
    return false;
  }
}
