class IntervalEdge {
  constructor(a, b, type) {
    this.a = a;
    this.b = b;
    this.type = type;
    this.lastActiveTime = 0;
  }

  color() {
    if (this.type === 'P5') return CONFIG.colors.edgeP5;
    if (this.type === 'M3') return CONFIG.colors.edgeM3;
    return CONFIG.colors.edgem3;
  }

  draw(g, active) {
    if (active) this.lastActiveTime = millis();
    const fadeFactor = getFadeFactor(this.lastActiveTime);

    // --- Maillage fin ---
    g.push();
    const baseColor = g.color(this.color());
    baseColor.setAlpha(60);
    g.stroke(baseColor);
    g.strokeWeight(CONFIG.edgeWidthThin);
    g.line(this.a.px, this.a.py, this.b.px, this.b.py);
    g.pop();

    // --- Highlight ---
    if (active || fadeFactor > 0) {
      g.push();
      const c = g.color(this.color());
      c.setAlpha(255 * fadeFactor);
      g.stroke(c);
      g.strokeWeight(CONFIG.edgeWidthThick);
      g.line(this.a.px, this.a.py, this.b.px, this.b.py);
      g.pop();

      // Label highlight
      const midX = (this.a.px + this.b.px) / 2;
      const midY = (this.a.py + this.b.py) / 2;
      let angle = Math.atan2(this.b.py - this.a.py, this.b.px - this.a.px);
      if (this.type === 'm3') angle += Math.PI;

      g.push();
      g.translate(midX, midY);
      g.rotate(angle);
      g.textAlign(g.CENTER, g.CENTER);
      g.textSize(CONFIG.edgeLabelSize || 14);
      g.noStroke();
      const labelColor = g.color(255);
      labelColor.setAlpha(255 * fadeFactor);
      g.fill(labelColor);
      g.text(this.type, 0, -5);
      g.pop();
    }
  }
}
