class IntervalEdge {
  constructor(a, b, interval) {
    this.a = a;
    this.b = b;
    this.interval = interval;
    this.lastActiveTime = 0;
  }

  isActive(selectedPcs) {
    return this.a.isActive(selectedPcs) && this.b.isActive(selectedPcs);
  }

  color() {
    switch (this.interval) {
      case 'P5': return CONFIG.colors.edgeP5;
      case 'M3': return CONFIG.colors.edgeM3;
      case 'm3': return CONFIG.colors.edgem3;
      default:   return CONFIG.colors.edgeP5;
    }
  }

draw(g, active, zoom = 1) {
  if (active) this.lastActiveTime = millis();
  const fadeFactor = getFadeFactor(this.lastActiveTime);

  g.push(); // ← encapsule tout

  const c = g.color(this.color());
  c.setAlpha(255 * fadeFactor);
  g.stroke(c);
  const weight = fadeFactor > 0
    ? CONFIG.edgeWidthThick * zoom
    : CONFIG.edgeWidthThin * zoom;
  g.strokeWeight(weight);
  g.line(this.a.px, this.a.py, this.b.px, this.b.py);

  if (fadeFactor > 0) {
    const midX = (this.a.px + this.b.px) / 2;
    const midY = (this.a.py + this.b.py) / 2;
    let angle = Math.atan2(this.b.py - this.a.py, this.b.px - this.a.px);
    if (this.interval === 'm3') angle += Math.PI;

    g.translate(midX, midY);
    g.rotate(angle);
    g.textAlign(g.CENTER, g.CENTER);
    g.textFont(CONFIG.fontFamily);
    g.textStyle(CONFIG.fontWeight);
    g.textSize(CONFIG.fontSize * 0.6 * zoom);
    g.noStroke();

    const bgColor = g.color(this.color());
    bgColor.setAlpha(255 * fadeFactor);
    g.fill(bgColor);
    g.circle(0, 0, CONFIG.fontSize * 0.8 * zoom);

    const labelColor = g.color(CONFIG.colors.bg);
    labelColor.setAlpha(255 * fadeFactor);
    g.fill(labelColor);
    g.text(this.interval, 0, 0);
  }

  g.pop(); // ← referme le contexte proprement
}

}
