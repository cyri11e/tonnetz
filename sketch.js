let tonnetz;

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
}

function draw() {
  background(CONFIG.colors.bg);
  tonnetz.drawGrid(this);
  tonnetz.drawTriangles(this);
  tonnetz.drawEdges(this);
  tonnetz.drawNodes(this);
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
