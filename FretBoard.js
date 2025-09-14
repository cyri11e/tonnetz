class Fretboard {
  constructor({
    frets = 12,
    canvasWidth,
    canvasHeight = null,
    heightRatio = 1/6,
    margin = 20,
    openStrings = [40,45,50,55,59,64]
  }) {
    this.frets        = frets
    this.canvasW      = canvasWidth
    this.canvasH      = canvasHeight || Math.round(canvasWidth * heightRatio)
    this.margin       = margin
    this.openStrings  = openStrings
    this.stringCount  = openStrings.length
    this.tuning       = openStrings.map(m => ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][m % 12])
    this.activeNotes  = new Set()
    this.rootPc       = null

    this.fretPositions   = [] // frettes 0 (sillet) à N
    this.stringY         = []
    this.stringThickness = []

    this.initLayout()
  }

  initLayout() {
    const m = this.margin
    const usableW = this.canvasW - 2*m
    const usableH = this.canvasH - 2*m

    const ratios = []
    for (let i = 0; i <= this.frets; i++) {
      ratios.push(1 - Math.pow(2, -i/12))
    }
    const maxR = ratios[this.frets] || 1
    this.fretPositions = ratios.map(r => m + (r/maxR)*usableW)

    const denom = Math.max(this.stringCount - 1, 1)
    for (let i = 0; i < this.stringCount; i++) {
      const ratio = 1 - i/denom
      this.stringY.push(m + ratio*usableH)
      this.stringThickness.push(1 + ((denom - i)/denom)*3)
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
    this.activeNotes.clear()
    midiNums.forEach(m => {
      this.openStrings.forEach((open, s) => {
        const f = m - open
        if (f >= 0 && f <= this.frets) {
          this.activeNotes.add(`${s}-${f}-${((m % 12)+12)%12}`)
        }
      })
    })
  }

  draw(g, rootPc = null) {
    g.push()
    g.translate(0, g.height - this.canvasH)

    const m = this.margin
    const nutX = this.fretPositions[0]
    const lastFretX = this.fretPositions[this.frets]

    // Fond
    g.noStroke()
    g.fill('#222')
    g.rect(0, 0, this.canvasW, this.canvasH)

    // Sillet
    g.stroke('#fff')
    g.strokeWeight(4)
    g.line(nutX, m, nutX, this.canvasH - m)

    // Frettes
    g.strokeWeight(1)
    for (let i = 1; i <= this.frets; i++) {
      g.line(this.fretPositions[i], m, this.fretPositions[i], this.canvasH - m)

    }

    // Cordes
    for (let i = 0; i < this.stringCount; i++) {
      g.stroke('#fff')
      g.strokeWeight(this.stringThickness[i])
      const y = this.stringY[i]
      g.line(nutX, y, lastFretX, y)
    }

    // Numéros de case
    const centerY = m + (this.canvasH - 2*m)/2
    g.textSize(16)
    g.fill('#fff')
    g.noStroke()
    g.textAlign(g.CENTER, g.CENTER)
    for (let k = 1; k <= this.frets; k++) {
      const cx = this.getCaseCenterX(k)
      if (cx != null) g.text(k, cx, centerY)
    }

    // Noms de cordes
    g.textSize(11)
    g.textAlign(g.RIGHT, g.CENTER)
    const xTxt = nutX - 10
    this.tuning.forEach((n,i) => g.text(n, xTxt, this.stringY[i]))

    // Pastilles
    this.activeNotes.forEach(id => {
      const [s,f,pc] = id.split('-').map(Number)
      const y = this.stringY[s]
      const isRoot = (rootPc ?? this.rootPc) === pc
      const cx = f === 0 ? nutX - 10 : this.getCaseCenterX(f)
      if (cx != null) {
        g.noStroke()
        g.fill(isRoot ? '#f00' : '#fc0')
        g.circle(cx, y, 12)
      }
    })

    g.pop()
  }
}
