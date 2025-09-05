// Configuration globale de l’application
const CONFIG = {
  // Durée (en ms) du fondu pour l’overlay des notes jouées
  fadeTime: 300,

  // Échelle de la grille Tonnetz (en pixels)
  unitX: 18,        // largeur d’une unité horizontale
  unitY: 18,        // hauteur d’une unité verticale

  zoomMin: 0.3,   // zoom minimum
  zoomMax: 3,     // zoom maximum

  // Propriétés des nœuds
  nodeRadius: 22,   // rayon de chaque nœud (px)
  fontSize: 22,     // taille de police de base pour les étiquettes (px)

  // Épaisseurs de traits pour les arêtes et triangles
  edgeWidthThin: 1,
  edgeWidthThick: 8,
  triangleStroke: 0,

  // Police utilisée pour tous les textes
  fontFamily: 'Arial Unicode MS',  // nom de la police
  fontWeight: 'bold',               // style/poids (normal, bold, etc.)

  //fontFamilyRoman: 'EB Garamond', // police avec empattement pour les accords
  fontFamilyRoman: 'Arial Unicode MS',

  // Palette de couleurs centralisée
  colors: {
    bg:                 '#0f0f10',         // couleur de fond du canvas
    nodeStroke:         '#cfcfd2',         // contour des nœuds
    nodeFill:           'rgba(0,0,0,0)',   // remplissage des nœuds (transparent)
    nodeLabel:          '#e7e7ea',         // couleur du texte des étiquettes
    grid:               'rgba(255,255,255,0.06)',
    grid12:             'rgba(255,255,255,0.12)',
    inactiveNodeStroke: 'rgba(207,207,210,0.3)', // contour des nœuds inactifs
    inactiveNodeLabel:  'rgba(231,231,234,0.3)', // étiquette des nœuds inactifs
    edgeP5:              '#2b5cff',           // bleu profond pour les liens P5
    edgeM3:              '#5fa8ff',           // bleu ciel pour les liens M3
    edgem3:              '#29d3c2',           // bleu turquoise les liens m3
    triangleMajor:       '#5fa8ff',           // bleu clair
    triangleMinor:       '#29d3c2',           // bleu foncé
    selectedNodeFill:    '#2a2a2a',           // fond gris pour notes dans la gamme
    selectedNodeStroke:  '#60b4feff',         // contour animé pour notes dans la gamme
    playedStroke:        '#ffd400',           // contour animé pour notes jouées
    rootStroke:          '#ff3333',           // contour animé pour la tonique
    chordDisplay:        'rgba(255,255,255,0.15)', // couleur du texte des accords
    tonicFillLight:      '#5b5b5bff',         // fond clair pour la tonique
    tonicTextDark:       '#0f0f10',           // couleur du texte sur tonique
    degreeLabel:         '#7a9ef5ff',         // gris doux, ou blanc si fond sombre

    // Couleurs par note (1 à 12)
    noteColors: [
      '#9a0918', // 1  
      '#a24b12', // 2  
      '#d38f09', // 3  
      '#668c1f', // 4  
      '#415623', // 5  
      '#387d52', // 6  
      '#338cbc', // 7  
      '#34335b', // 8  
      '#271f5f', // 9  
      '#58234b', // 10 
      '#841f4e', // 11 
      '#9e003d'  // 12
    ]
  }
};
