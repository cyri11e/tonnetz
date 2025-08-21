// ---------- Config visuelle ----------
const CONFIG = {
  unitX: 18,       // px par 1 demi-ton (axe X logique)
  unitY: 18,       // px par 1 unité Y (esthétique)
  nodeRadius: 22,  // x2
  fontSize: 22,    // x2
  colors: {
    bg: '#0f0f10',
    grid: 'rgba(255,255,255,0.06)',
    grid12: 'rgba(255,255,255,0.12)',
    nodeStroke: '#cfcfd2',
    nodeFill: 'rgba(0,0,0,0)',   // vide pour minimalisme
    nodeLabel: '#e7e7ea',
    selectedStroke: '#ffd400',   // liseret jaune
    edgeP5: '#2b5cff',           // bleu profond
    edgeM3: '#5fa8ff',           // bleu ciel
    edgem3: '#29d3c2',           // bleu turquoise
    triangleFill: 'rgba(255,255,255,0.28)'
  },
  edgeWidthThin: 1.2,
  edgeWidthThick: 8, // x2
  triangleStroke: 0
};

// ---------- Utilitaires musique ----------
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const nameToPc = (name) => NOTE_NAMES.indexOf(name);
const pcToName = (pc) => NOTE_NAMES[(pc % 12 + 12) % 12];

// ---------- Vecteurs fondamentaux ----------
const U = { x: 4, y: 5 };   // +M3
const V = { x: -3, y: 5 };  // +m3
const QV = { x: 7, y: 0 };  // +P5 = U - V
