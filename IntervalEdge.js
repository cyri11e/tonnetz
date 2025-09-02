class IntervalEdge {
  constructor(a, b, interval, label, angle, midpoint) {
    this.a = a;
    this.b = b;
    this.interval = interval;
    this.label = label;               // Texte à afficher (ex: "M3")
    this.angle = angle;               // Angle d’orientation du label
    this.midpoint = midpoint;         // Coordonnées du centre
    this.lastActiveTime = 0;
  }

  static build(a, b, intervalType) {
    const midX = (a.px + b.px) / 2;
    const midY = (a.py + b.py) / 2;
    let angle = Math.atan2(b.py - a.py, b.px - a.px);
    if (intervalType === 'm3') angle += Math.PI;

    return new IntervalEdge(a, b, intervalType, intervalType, angle, { x: midX, y: midY });
  }


  static detectInterval(a, b) {
    const diff = mod12(b.pc - a.pc);
    if (diff === 4) return 'M3';
    if (diff === 3) return 'm3';
    if (diff === 7) return 'P5';
    return null;
  }

  isActive(activePcs) {
    return this.a.isActive(activePcs) && this.b.isActive(activePcs);
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

    g.push();

    const c = g.color(this.color());
    c.setAlpha(255 * fadeFactor);
    g.stroke(c);
    const weight = fadeFactor > 0
      ? CONFIG.edgeWidthThick * zoom
      : CONFIG.edgeWidthThin * zoom;
    g.strokeWeight(weight);
    g.line(this.a.px, this.a.py, this.b.px, this.b.py);

    if (fadeFactor > 0) {
      g.translate(this.midpoint.x, this.midpoint.y);
      g.rotate(this.angle);
      g.textAlign(g.CENTER, g.CENTER);
      g.textFont(CONFIG.fontFamily);
      g.textStyle(CONFIG.fontWeight);
      g.textSize(CONFIG.fontSize * 0.5 * zoom);
      g.noStroke();

      const bgColor = g.color(this.color());
      bgColor.setAlpha(255 * fadeFactor);
      g.fill(bgColor);
      g.circle(0, 0, CONFIG.fontSize * 0.8 * zoom);

      const labelColor = g.color(CONFIG.colors.bg);
      labelColor.setAlpha(255 * fadeFactor);
      g.fill(labelColor);
      g.text(this.label, 0, 0);
    }

    g.pop();
  }
}
