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

  color() {
    switch (this.interval) {
      case 'P5': return CONFIG.colors.edgeP5;
      case 'M3': return CONFIG.colors.edgeM3;
      case 'm3': return CONFIG.colors.edgem3;
      default:   return CONFIG.colors.edgeP5;
    }
  }

draw(g, active, inGamme, zoom = 1) {
  if (active) this.lastActiveTime = millis();

  const f = getFadeFactor(this.lastActiveTime ?? 0); // 0..1
  const vis = active ? 1 : f;

  g.push();

  const colorMain = g.color(this.color());
  const alpha = Math.round(255 * vis);
  const weight = (CONFIG.edgeWidthThin + (CONFIG.edgeWidthThick - CONFIG.edgeWidthThin) * vis) * zoom;

  // SEGMENT couche de base
  if ( inGamme ) {
    g.stroke(CONFIG.colors.selectedNodeStroke);
    g.strokeWeight(weight);
    g.line(this.a.px, this.a.py, this.b.px, this.b.py);
  } 
  // SEGMENT
  colorMain.setAlpha(alpha);
  g.stroke(colorMain);
  g.strokeWeight(weight);
  g.line(this.a.px, this.a.py, this.b.px, this.b.py);

  // PASTILLE + LABEL
  const midX = (this.a.px + this.b.px) / 2;
  const midY = (this.a.py + this.b.py) / 2;

  g.translate(midX, midY);
  g.rotate(this.angle);
  g.textAlign(g.CENTER, g.CENTER);
  g.textFont(CONFIG.fontFamily);
  g.textStyle(CONFIG.fontWeight);
  g.textSize(CONFIG.fontSize * 0.5 * zoom);
  g.noStroke();

  // Label (affiché uniquement si zoom ≥ 1.5)
  if (zoom >= 1.5) {
    const labelColor = g.color(CONFIG.colors.bg);
    labelColor.setAlpha(alpha);
    g.fill(labelColor);
    g.text(this.label, 0, 0);
  }

  g.pop();
}


}
