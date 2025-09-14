class InteractionManager {
  constructor() {
    this.zones = [];
    this.activeZone = null;
    this.debug = true;
    this.isWheeled = false;
  }

  registerZone(zone) {
    this.zones.push(zone);
  }

  clearZones() {
    this.zones.length = 0;
    this.activeZone = null;
  }

  hit(mx, my) {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      if (z.contains(mx, my)) return z;
    }
    return null;
  }

  handleEvent(type, data = {}) {
    const enriched = {
      mx: mouseX,
      my: mouseY,
      dx: movedX,
      dy: movedY,
      shift: keyIsDown(SHIFT),
      button: mouseButton,
      ...data
    };

    switch (type) {
      case 'hover': {
        if (this.isWheeled) {
          for (const z of this.zones) z.syncCallback?.();
          this.isWheeled = false;
        }
        for (const z of this.zones) {
          z.isHovered = z.contains(enriched.mx, enriched.my);
          if (z.isHovered) z.onHover?.(enriched.mx, enriched.my, enriched);
        }
        break;
      }

      case 'press': {
        this.activeZone = this.hit(enriched.mx, enriched.my);
        if (this.activeZone) {
          this.activeZone.onClick?.(enriched.mx, enriched.my, enriched);
        }
        break;
      }

      case 'drag': {
        if (this.activeZone) {
          this.activeZone.onDrag?.(enriched.mx, enriched.my, enriched);
        }
        break;
      }

      case 'release': {
        if (this.activeZone) {
          this.activeZone.onRelease?.(enriched.mx, enriched.my, enriched);
          this.activeZone = null;
        }
        for (const z of this.zones) z.syncCallback?.();
        break;
      }

      case 'wheel': {
        const target = this.activeZone ?? this.hit(enriched.mx, enriched.my);
        target?.onWheel?.(enriched.mx, enriched.my, enriched);
        this.isWheeled = true;
        break;
      }
    }
  }

  drawDebug() {
    if (!this.debug) return;
    for (const zone of this.zones) zone.drawDebug();
  }
}
