class IntervalEdge {
  constructor(a, b, type) {
    this.a = a; // NoteNode
    this.b = b; // NoteNode
    this.type = type; // 'P5' | 'M3' | 'm3'
  }

  color() {
    if (this.type === 'P5') return CONFIG.colors.edgeP5;
    if (this.type === 'M3') return CONFIG.colors.edgeM3;
    return CONFIG.colors.edgem3;
  }

  draw(g, active) {
    if (!active) return; // minimaliste: on n’affiche épais que si les deux nœuds sont actifs
    g.push();
    g.stroke(this.color());
    g.strokeWeight(CONFIG.edgeWidthThick); // x2
    g.line(this.a.px, this.a.py, this.b.px, this.b.py);
    g.pop();
  }
}
