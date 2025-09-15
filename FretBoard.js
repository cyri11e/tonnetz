class Fretboard {
  constructor({
    frets = 12,
    canvasWidth = 800,
    canvasHeight = null,
    openStrings = [40, 45, 50, 55, 59, 64],
    maxSpan = 5,
    alwaysAllowOpen = true,
    showImpossibleNotes = true
  }) {
    this.frets = frets
    this.openStrings = openStrings
    this.stringCount = openStrings.length
    this.tuning = openStrings.map(m => ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][m % 12])
    this.maxSpan = maxSpan
    this.alwaysAllowOpen = alwaysAllowOpen
    this.showImpossibleNotes = showImpossibleNotes
    this.rootPc = null
    this.hide = false
    this.activeNotes = new Set()
    this.impossibleNotes = new Set()
    this.activeRange = [0, frets]
this.pendingMidi = []
this.stabilizeTimer = null
this.stabilizeDelay = 100 // en ms

    this.resizeTo(canvasWidth, canvasHeight || Math.round(canvasWidth * 0.2))
  }

  resizeTo(w, h) {
    this.canvasW = w
    this.canvasH = h
    this.margin = w * 0.05
    this.unit = h / (this.stringCount + 2)

    const usableW = w - 2 * this.margin
    const usableH = h - 2 * this.margin

    const ratios = []
    for (let i = 0; i <= this.frets; i++) {
      ratios.push(1 - Math.pow(2, -i / 12))
    }
    const maxR = ratios[this.frets] || 1
    this.fretPositions = ratios.map(r => this.margin + (r / maxR) * usableW)

    const denom = Math.max(this.stringCount - 1, 1)
    this.stringY = []
    this.stringThickness = []
    for (let i = 0; i < this.stringCount; i++) {
      const ratio = 1 - i / denom
      this.stringY.push(this.margin + ratio * usableH)
      this.stringThickness.push(this.unit * 0.2 + ((denom - i) / denom) * this.unit * 0.3)
    }
  }

  getCaseCenterX(caseIndex) {
    const x0 = this.fretPositions[caseIndex - 1]
    const x1 = this.fretPositions[caseIndex]
    return (x0 != null && x1 != null) ? (x0 + x1) / 2 : null
  }

  setRootPc(rootPc) {
    this.rootPc = ((rootPc % 12) + 12) % 12
  }

setMidiNotes(midiNums = []) {
  this.activeNotes = new Set()
  this.impossibleNotes = new Set()

  const selected = []
  const usedStrings = new Set()
  const sortedMidi = midiNums.slice().sort((a, b) => b - a)

  for (const m of sortedMidi) {
    const pc = ((m % 12) + 12) % 12
    const candidates = []

    for (let s = 0; s < this.openStrings.length; s++) {
      const f = m - this.openStrings[s]
      if (f >= 0 && f <= this.frets) {
        candidates.push({ midi: m, string: s, fret: f, pc })
      }
    }

    candidates.sort((a, b) => (b.string - a.string) || (a.fret - b.fret))
    const chosen = candidates.find(p => !usedStrings.has(p.string))

    if (chosen) {
      selected.push(chosen)
      usedStrings.add(chosen.string)
    } else if (candidates.length > 0) {
      this.impossibleNotes.add(`${candidates[0].string}-${candidates[0].fret}-${candidates[0].pc}`)
    } else {
      this.impossibleNotes.add(`0-0-${pc}`)
    }
  }

  let fretMin = Infinity, fretMax = -Infinity
  for (const p of selected) {
    if (p.fret !== 0 || !this.alwaysAllowOpen) {
      fretMin = Math.min(fretMin, p.fret)
      fretMax = Math.max(fretMax, p.fret)
    }
  }
  if (!isFinite(fretMin)) { fretMin = 0; fretMax = 0 }

  this.activeRange = [Math.max(0, fretMax - this.maxSpan), fretMax]
  const span = fretMax - fretMin
  const tooWide = span > this.maxSpan

  for (const p of selected) {
    const id = `${p.string}-${p.fret}-${p.pc}`
    if (tooWide) {
      this.impossibleNotes.add(id)
    } else {
      this.activeNotes.add(id)
    }
  }
}


draw(g, rootPc = null) {
  if (this.hide) return
  g.push()
  g.translate(0, g.height - this.canvasH)

  const nutX = this.fretPositions[0]
  const lastFretX = this.fretPositions[this.frets]
  const centerY = this.margin + (this.canvasH - 2 * this.margin) / 2
  const [minFret, maxFret] = this.activeRange

  // 🎸 Fond du manche
  g.noStroke()
  g.fill('#222')
  g.rect(0, 0, this.canvasW, this.canvasH)

  // 🎸 Sillet
  g.stroke('#fff')
  g.strokeWeight(this.unit * 0.15)
  g.line(nutX, this.margin, nutX, this.canvasH - this.margin)

  // 🎸 Frettes
  g.strokeWeight(this.unit * 0.08)
  for (let i = 1; i <= this.frets; i++) {
    g.line(this.fretPositions[i], this.margin, this.fretPositions[i], this.canvasH - this.margin)
  }

  // 🎸 Zones hors plage (grisé)
  g.noStroke()
  g.fill(0, 0, 0, 120)
  for (let k = 0; k <= this.frets; k++) {
    if (k < minFret || k > maxFret) {
      const x0 = this.fretPositions[k - 1] || nutX
      const x1 = this.fretPositions[k]
      if (x0 != null && x1 != null) {
        g.rect(x0, this.margin, x1 - x0, this.canvasH - 2 * this.margin)
      }
    }
  }

  // 🎸 Cordes
  for (let i = 0; i < this.stringCount; i++) {
    const y = this.stringY[i]
    const isActive = [...this.activeNotes].some(id => id.startsWith(`${i}-`))
    g.stroke(isActive ? '#fc0' : '#aaa')
    g.strokeWeight(this.unit * 0.05 + (this.stringCount - 1 - i) * this.unit * 0.02)
    g.line(nutX, y, lastFretX, y)
  }

  // 🎵 Noms des cordes
  g.noStroke()
  g.textSize(this.unit * 0.6)
  g.textAlign(g.RIGHT, g.CENTER)
  for (let i = 0; i < this.stringCount; i++) {
    const y = this.stringY[i]
    const xTxt = nutX - this.unit * 0.8
    const isActive = [...this.activeNotes].some(id => id.startsWith(`${i}-`))
    const color = isActive ? '#fc0' : '#fff'
    g.fill(color)
    g.text(this.tuning[i], xTxt, y)
  }

  // 🎯 Repères visuels
  g.noFill()
  g.stroke('#fff')
  g.strokeWeight(this.unit * 0.08)
  ;[3,5,7,9,12,15,17,19].forEach(k => {
    if (k > this.frets) return
    const cx = this.getCaseCenterX(k)
    if (cx != null) {
      if (k === 12) {
        g.circle(cx, centerY - this.unit * 0.6, this.unit * 0.4)
        g.circle(cx, centerY + this.unit * 0.6, this.unit * 0.4)
      } else {
        g.circle(cx, centerY, this.unit * 0.4)
      }
    }
  })

  // 🔢 Numéros de frettes
  g.textSize(this.unit * 0.5)
  g.textAlign(g.CENTER, g.TOP)
  g.noStroke()
  g.fill('#fff')
  for (let k = 1; k <= this.frets; k++) {
    if ([3,5,7,9,12,15,17,19].includes(k)) {
      const cx = this.getCaseCenterX(k)
      if (cx != null) {
        g.text(k, cx, this.canvasH - this.margin + this.unit * 0.2)
      }
    }
  }

  // 🟡 Pastilles des notes actives
  this.activeNotes.forEach(id => {
    const [s, f, pc] = id.split('-').map(Number)
    const y = this.stringY[s]
    const cx = f === 0 ? nutX - this.unit * 0.8 : this.getCaseCenterX(f)
    if (cx != null) {
      g.noStroke()
      g.fill((rootPc ?? this.rootPc) === pc ? '#f00' : '#fc0')
      g.circle(cx, y, this.unit * 0.8)
    }
  })

  // ❌ Croix rouges pour notes impossibles
  this.impossibleNotes.forEach(id => {
    const [s, f] = id.split('-').map(Number)
    const y = this.stringY[s]
    const cx = f === 0 ? nutX - this.unit * 0.8 : this.getCaseCenterX(f)
    if (cx != null) {
      g.stroke('#f00')
      g.strokeWeight(this.unit * 0.15)
      g.line(cx - this.unit * 0.5, y - this.unit * 0.5, cx + this.unit * 0.5, y + this.unit * 0.5)
      g.line(cx - this.unit * 0.5, y + this.unit * 0.5, cx + this.unit * 0.5, y - this.unit * 0.5)
    }
  })

  g.pop()
}

}
