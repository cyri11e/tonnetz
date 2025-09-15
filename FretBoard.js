class Fretboard {
  constructor({
    frets = 12,
    canvasWidth,
    canvasHeight = null,
    heightRatio = 1/6,
    margin = 20,
    openStrings = [40,45,50,55,59,64],
    maxSpan = 5,
    alwaysAllowOpen = true,
    showImpossibleNotes = true
  }) {
    this.frets        = frets
    this.canvasW      = canvasWidth
    this.canvasH      = canvasHeight || Math.round(canvasWidth * heightRatio)
    this.margin       = margin
    this.openStrings  = openStrings
    this.stringCount  = openStrings.length
    this.tuning       = openStrings.map(m => ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][m % 12])
    this.rootPc       = null
    this.hide         = false

    this.maxSpan            = maxSpan
    this.alwaysAllowOpen    = alwaysAllowOpen
    this.showImpossibleNotes= showImpossibleNotes

    this.activeNotes        = new Set()
    this.impossibleNotes    = new Set()
    this.activeRange        = [0, frets]

    this.fretPositions   = []
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
  this.activeNotes = new Set()
  this.impossibleNotes = new Set()

  const selected = []
  const usedStrings = new Set()

  // 1) Trier les notes MIDI du plus aigu au plus grave
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

    // Trier par corde la plus aiguë, puis frette la plus basse
    candidates.sort((a, b) => (b.string - a.string) || (a.fret - b.fret))

    const chosen = candidates.find(p => !usedStrings.has(p.string))
    if (chosen) {
      selected.push(chosen)
      usedStrings.add(chosen.string)
    } else if (candidates.length > 0) {
      // Toutes les cordes sont prises → on garde une position pour croix rouge
      this.impossibleNotes.add(`${candidates[0].string}-${candidates[0].fret}-${candidates[0].pc}`)
    } else {
      // Aucune position possible → croix par défaut
      this.impossibleNotes.add(`0-0-${pc}`)
    }
  }

  // 2) Calculer la plage
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
    if (this.hide) return;
    g.push()
    g.translate(0, g.height - this.canvasH)

    const m = this.margin
    const nutX = this.fretPositions[0]
    const lastFretX = this.fretPositions[this.frets]
    const centerY = m + (this.canvasH - 2*m)/2
    const [minFret, maxFret] = this.activeRange

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
    g.stroke('#fff')
    for (let i = 1; i <= this.frets; i++) {
      g.line(this.fretPositions[i], m, this.fretPositions[i], this.canvasH - m)
    }

    // Zones hors manche actives : grisé
    g.noStroke()
    g.fill(0, 0, 0, 120)
    for (let k = 0; k <= this.frets; k++) {
      if (k < minFret || k > maxFret) {
        const x0 = this.fretPositions[k - 1] || nutX
        const x1 = this.fretPositions[k]
        if (x0 != null && x1 != null) {
          g.rect(x0, m, x1 - x0, this.canvasH - 2*m)
        }
      }
    }

    // Cordes
    for (let i = 0; i < this.stringCount; i++) {
      const y = this.stringY[i]
      const isActive = [...this.activeNotes].some(id => {
        const [s,f] = id.split('-').map(Number)
        return s === i && (f >= minFret && f <= maxFret || (f === 0 && this.alwaysAllowOpen))
      })
      g.stroke(isActive ? '#fc0' : '#fff')
      g.strokeWeight(this.stringThickness[i])
      g.line(nutX, y, lastFretX, y)
    }

    // Noms de cordes + cercle si active
    g.textSize(11)
    g.textAlign(g.RIGHT, g.CENTER)
    for (let i = 0; i < this.stringCount; i++) {
      const y = this.stringY[i]
      const xTxt = nutX - 10
      const isActive = [...this.activeNotes].some(id => {
        const [s,f] = id.split('-').map(Number)
        return s === i && (f >= minFret && f <= maxFret || (f === 0 && this.alwaysAllowOpen))
      })
      const color = isActive
        ? [...this.activeNotes].some(id => id.startsWith(`${i}-0-${this.rootPc}`)) ? '#f00' : '#fc0'
        : '#fff'
      g.fill(color)
      g.text(this.tuning[i], xTxt, y)
      if (isActive) {
        g.noFill()
        g.stroke(color)
        g.strokeWeight(2)
        g.circle(xTxt, y, 18)
      }
    }

    // Repères
    g.noFill()
    g.stroke('#fff')
    g.strokeWeight(1)
    ;[3,5,7,9,12,15,17,19].forEach(k => {
      if (k > this.frets) return
      const cx = this.getCaseCenterX(k)
      if (cx != null) {
        if (k === 12) {
          g.circle(cx, centerY - 5, 8)
          g.circle(cx, centerY + 5, 8)
        } else {
          g.circle(cx, centerY, 8)
        }
      }
    })

    // Numéros de frette sous le manche
    g.textSize(12)
    g.fill('#fff')
    g.noStroke()
    g.textAlign(g.CENTER, g.TOP)
    for (let k = 1; k <= this.frets; k++) {
      if ([3,5,7,9,12,15,17,19].includes(k)) {
        const cx = this.getCaseCenterX(k)
        if (cx != null) {
          g.text(k, cx, this.canvasH - m + 6)
        }
      }
    }

    // Pastilles normales
    this.activeNotes.forEach(id => {
      const [s,f,pc] = id.split('-').map(Number)
      const y = this.stringY[s]
      const isRoot = (rootPc ?? this.rootPc) === pc
      const cx = f === 0 ? nutX - 10 : this.getCaseCenterX(f)
      if (cx != null) {
        g.noStroke()
        g.fill(isRoot ? '#f00' : '#fc0')
        g.circle(cx, y, 22)
      }
    })

    // Croix rouges pour notes impossibles
    this.impossibleNotes?.forEach(id => {
      const [s,f] = id.split('-').map(Number)
      const y = this.stringY[s]
      const cx = f === 0 ? nutX - 10 : this.getCaseCenterX(f)
      if (cx != null) {
        g.stroke('#f00')
        g.strokeWeight(2)
        g.line(cx - 8, y - 8, cx + 8, y + 8)
        g.line(cx - 8, y + 8, cx + 8, y - 8)
      }
    })

    g.pop()
  }
}
