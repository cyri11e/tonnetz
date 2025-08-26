// IntervalEdge — utilisé par : Tonnetz
class IntervalEdge {
  constructor(a, b, interval) {
    this.a = a;           // NoteNode de départ
    this.b = b;           // NoteNode d’arrivée
    this.interval = interval; // 'M3', 'm3', 'P5'
    this.lastActiveTime = 0;
  }

  // Détermine si l’arête est active (les deux notes sont actives)
  isActive(selectedPcs) {
    return this.a.isActive(selectedPcs) && this.b.isActive(selectedPcs);
  }

  draw(g, active) {
    if (active) this.lastActiveTime = millis();
    const fadeFactor = getFadeFactor(this.lastActiveTime); // helpers.js

    // Choix de la couleur selon l’intervalle
    let col;
    switch (this.interval) {
      case 'P5': col = CONFIG.colors.edgeP5; break;
      case 'M3': col = CONFIG.colors.edgeM3; break;
      case 'm3': col = CONFIG.colors.edgem3; break;
      default:   col = CONFIG.colors.edgeP5;
    }

    const c = g.color(col);
    c.setAlpha(255 * fadeFactor);

    g.stroke(c);
    g.strokeWeight(active ? CONFIG.edgeWidthThick : CONFIG.edgeWidthThin);
    g.line(this.a.px, this.a.py, this.b.px, this.b.py);
  }
}
