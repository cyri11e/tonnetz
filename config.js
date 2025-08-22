// ---------- Config visuelle ----------
const CONFIG = {
  fadeTime : 200, // en millisecondes
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
    rootStroke: '#ff3333',       // tonique en rouge
    edgeP5: '#2b5cff',           // bleu profond
    edgeM3: '#5fa8ff',           // bleu ciel
    edgem3: '#29d3c2',           // bleu turquoise
    triangleFill: 'rgba(255,255,255,0.28)',
    inactiveNodeStroke: 'rgba(207,207,210,0.3)',  // version atténuée
    inactiveNodeLabel: 'rgba(231,231,234,0.3)',   // version atténuée
    chordDisplay: 'rgba(255,255,255,0.15)'       // accord reconnu
  },
  edgeWidthThin: 1,
  edgeWidthThick: 8, // x2
  triangleStroke: 0
};

// ---------- Utilitaires musique ----------
const ENHARMONIC_MAPS = {
  sharp: ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'],
  flat:  ['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'],
  mixed: ['C','D♭','D','E♭','E','F','F♯','G','A♭','A','B♭','B'] // version courante
};

const NOTE_NAMES = ENHARMONIC_MAPS.sharp; // valeur par défaut
const nameToPc = (name) => NOTE_NAMES.indexOf(name);
const pcToName = (pc) => NOTE_NAMES[(pc % 12 + 12) % 12];

// ---------- Vecteurs fondamentaux ----------
const U = { x: 4, y: 5 };   // +M3
const V = { x: -3, y: 5 };  // +m3
const QV = { x: 7, y: 0 };  // +P5 = U - V
